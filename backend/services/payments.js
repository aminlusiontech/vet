const Stripe = require("stripe");
const PaymentSettings = require("../model/paymentSettings");
const ErrorHandler = require("../utils/ErrorHandler");

const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW"]);

const toMinorUnits = (amount, currency) => {
  if (amount === undefined || amount === null) {
    throw new ErrorHandler("Amount is required", 400);
  }
  const normalized = Number(amount);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new ErrorHandler("Amount must be a positive number", 400);
  }

  if (ZERO_DECIMAL_CURRENCIES.has(String(currency || "").toUpperCase())) {
    return Math.round(normalized);
  }

  return Math.round(normalized * 100);
};

const fromMinorUnits = (amount, currency) => {
  if (amount === undefined || amount === null) {
    throw new ErrorHandler("Minor unit amount is required", 400);
  }

  const normalized = Number(amount);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new ErrorHandler("Minor unit amount must be a non-negative number", 400);
  }

  const upperCurrency = String(currency || "").toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(upperCurrency)) {
    return normalized;
  }

  return normalized / 100;
};

const resolvePaymentSettings = async (slug = "global") => {
  const settings = await PaymentSettings.ensureSettings(slug);
  return settings;
};

const getStripeClient = (secretKey) => {
  if (!secretKey) {
    throw new ErrorHandler("Stripe secret key is not configured", 500);
  }
  return new Stripe(secretKey);
};

const createStripePaymentIntent = async ({
  amount,
  currency,
  metadata = {},
  customer,
  receiptEmail,
  paymentMethodTypes,
  captureMethod = "automatic",
}) => {
  const settings = await resolvePaymentSettings();
  const stripeConfig = settings.stripe || {};

  if (!stripeConfig.enabled) {
    throw new ErrorHandler("Stripe payments are currently disabled", 503);
  }

  const mode = stripeConfig.mode || "test";
  const credentials = stripeConfig[mode] || {};
  
  if (!credentials.secretKey) {
    throw new ErrorHandler(
      `Stripe ${mode} secret key is not configured. Please check your payment settings and ensure the ${mode} secret key is set.`,
      500
    );
  }

  // Validate that the secret key matches the mode
  const secretKey = credentials.secretKey.trim();
  const expectedSecretPrefix = mode === "live" ? "sk_live_" : "sk_test_";
  
  if (!secretKey.startsWith(expectedSecretPrefix)) {
    throw new ErrorHandler(
      `Configuration error: Mode is set to "${mode}" but the secret key starts with "${secretKey.substring(0, 7)}". ` +
      `For ${mode} mode, the key should start with "${expectedSecretPrefix}". ` +
      `Please check your payment settings and ensure the keys match the selected mode.`,
      500
    );
  }
  
  const stripe = getStripeClient(secretKey);
  
  // Log secret key identifier for debugging
  const skIdentifier = secretKey.split("_").slice(2).join("_").substring(0, 15);
  console.log(`Creating payment intent with secret key identifier: ${skIdentifier}...`);

  const resolvedCurrency =
    (currency || settings.defaultCurrency || credentials.currency || "GBP").toUpperCase();
  const amountInMinor = toMinorUnits(amount, resolvedCurrency);

  // Enable automatic payment methods (includes Klarna if configured in Stripe dashboard)
  // Or use explicit payment_method_types if provided
  const paymentIntentParams = {
    amount: amountInMinor,
    currency: resolvedCurrency,
    customer,
    receipt_email: receiptEmail,
    capture_method: captureMethod,
    metadata: {
      ...metadata,
      mode,
    },
  };

  if (Array.isArray(paymentMethodTypes) && paymentMethodTypes.length > 0) {
    paymentIntentParams.payment_method_types = paymentMethodTypes;
  } else {
    // Enable automatic payment methods (includes Klarna, card, etc. based on Stripe dashboard config)
    paymentIntentParams.automatic_payment_methods = {
      enabled: true,
    };
  }

  let intent;
  try {
    intent = await stripe.paymentIntents.create(paymentIntentParams);
  } catch (stripeError) {
    console.error("Stripe API error creating payment intent:", {
      message: stripeError.message,
      type: stripeError.type,
      code: stripeError.code,
      statusCode: stripeError.statusCode,
    });
    throw new ErrorHandler(
      `Failed to create payment intent: ${stripeError.message || "Unknown error"}`,
      stripeError.statusCode || 500
    );
  }

  if (!intent || !intent.client_secret) {
    throw new ErrorHandler("Payment intent was created but client secret is missing", 500);
  }

  console.log(`Payment intent created successfully: ${intent.id} in ${mode} mode`);
  console.log(`Payment intent amount: ${intent.amount} ${intent.currency}`);
  console.log(`Payment intent status: ${intent.status}`);
  
  // Verify the payment intent is accessible (this helps catch key mismatch issues early)
  try {
    const retrievedIntent = await stripe.paymentIntents.retrieve(intent.id);
    console.log(`✓ Payment intent verified: ${retrievedIntent.id}`);
  } catch (verifyError) {
    console.warn(`⚠️  Warning: Could not verify payment intent: ${verifyError.message}`);
  }

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amount: intent.amount,
    currency: intent.currency,
    mode,
  };
};

const retrieveStripePaymentIntent = async (paymentIntentId) => {
  if (!paymentIntentId) {
    throw new ErrorHandler("Payment intent id is required", 400);
  }

  const settings = await resolvePaymentSettings();
  const stripeConfig = settings.stripe || {};

  if (!stripeConfig.enabled) {
    throw new ErrorHandler("Stripe payments are currently disabled", 503);
  }

  const mode = stripeConfig.mode || "test";
  const credentials = stripeConfig[mode] || {};
  const stripe = getStripeClient(credentials.secretKey);

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return intent;
};

const getStripePublishableKey = async () => {
  const settings = await resolvePaymentSettings();
  const stripeConfig = settings.stripe || {};

  if (!stripeConfig.enabled) {
    throw new ErrorHandler("Stripe payments are currently disabled", 503);
  }

  const mode = stripeConfig.mode || "test";
  const credentials = stripeConfig[mode] || {};

  if (!credentials.publishableKey) {
    throw new ErrorHandler(
      `Stripe ${mode} publishable key is not configured. Please check your payment settings.`,
      500
    );
  }

  // Validate that the key matches the mode
  const publishableKey = credentials.publishableKey.trim();
  const expectedPrefix = mode === "live" ? "pk_live_" : "pk_test_";
  
  if (!publishableKey.startsWith(expectedPrefix)) {
    throw new ErrorHandler(
      `Configuration error: Mode is set to "${mode}" but the publishable key starts with "${publishableKey.substring(0, 7)}". ` +
      `For ${mode} mode, the key should start with "${expectedPrefix}". ` +
      `Please check your payment settings and ensure the keys match the selected mode.`,
      500
    );
  }

  // Log key identifiers for debugging
  const secretKey = credentials.secretKey?.trim() || "";
  if (secretKey) {
    const expectedSecretPrefix = mode === "live" ? "sk_live_" : "sk_test_";
    if (secretKey.startsWith(expectedSecretPrefix)) {
      // Extract identifiers (the part after pk_live_/sk_live_)
      const pkParts = publishableKey.split("_");
      const skParts = secretKey.split("_");
      
      // Get the identifier part (everything after the mode prefix)
      const pkIdentifier = pkParts.slice(2).join("_");
      const skIdentifier = skParts.slice(2).join("_");
      
      // Stripe secret keys often have an extra character at the start of the identifier
      // So we compare: pk_live_1ABC... with sk_live_51ABC... (the "5" is normal)
      // We'll compare the core identifier by removing the first char from secret key if needed
      const pkCore = pkIdentifier.substring(0, 12);
      const skCore = skIdentifier.substring(0, 12);
      const skCoreAlt = skIdentifier.substring(1, 13); // Skip first char for comparison
      
      console.log(`Publishable key identifier: ${pkIdentifier.substring(0, 15)}...`);
      console.log(`Secret key identifier: ${skIdentifier.substring(0, 15)}...`);
      
      // Check if identifiers match (accounting for the extra char in secret keys)
      // Keys from same account should have matching core after the first char of secret key
      const keysMatch = pkCore === skCore || pkCore === skCoreAlt;
      
      if (!keysMatch) {
        console.warn(
          `⚠️  WARNING: Publishable and secret key identifiers don't match! ` +
          `This suggests they may be from different Stripe accounts. ` +
          `If you get 401 errors, verify both keys are from the same Stripe account.`
        );
      } else {
        console.log(`✓ Key identifiers match - keys appear to be from the same Stripe account`);
      }
    }
  }

  const currency = (settings.defaultCurrency || "GBP").toUpperCase();

  return {
    publishableKey,
    mode,
    currency,
  };
};

module.exports = {
  resolvePaymentSettings,
  createStripePaymentIntent,
  getStripePublishableKey,
  retrieveStripePaymentIntent,
  toMinorUnits,
  fromMinorUnits,
};


