# Email Configuration Guide

## Gmail SMTP Setup

If you're getting authentication errors (535, BadCredentials), follow these steps:

### Step 1: Enable 2-Step Verification
1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Under "Signing in to Google", click **2-Step Verification**
4. Follow the prompts to enable 2-Step Verification

### Step 2: Generate an App Password
1. Go back to **Security** settings
2. Under "Signing in to Google", click **App passwords**
3. You may need to sign in again
4. Select **Mail** as the app
5. Select **Other (Custom name)** as the device
6. Enter a name like "Multivendor App"
7. Click **Generate**
8. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

### Step 3: Update Your .env File
Update your `.env` file with the following:

```env
SMPT_HOST=smtp.gmail.com
SMPT_PORT=465
SMPT_MAIL=your-email@gmail.com
SMPT_PASSWORD=your-16-character-app-password
```

**Important Notes:**
- Use your **full Gmail address** for `SMPT_MAIL`
- Use the **App Password** (not your regular Gmail password) for `SMPT_PASSWORD`
- Remove any spaces from the App Password when pasting it
- The App Password should be 16 characters without spaces

### Step 4: Restart Your Server
After updating the `.env` file, restart your Node.js server for the changes to take effect.

## Alternative: Using Other Email Services

### Outlook/Hotmail
```env
SMPT_HOST=smtp-mail.outlook.com
SMPT_PORT=587
SMPT_MAIL=your-email@outlook.com
SMPT_PASSWORD=your-password
```

### Yahoo Mail
```env
SMPT_HOST=smtp.mail.yahoo.com
SMPT_PORT=587
SMPT_MAIL=your-email@yahoo.com
SMPT_PASSWORD=your-app-password
```

### Custom SMTP Server
```env
SMPT_HOST=your-smtp-server.com
SMPT_PORT=465
SMPT_MAIL=your-email@domain.com
SMPT_PASSWORD=your-password
```

## Troubleshooting

### Error: "535 Username and Password not accepted"
- **Solution**: Make sure you're using an App Password, not your regular Gmail password
- Verify 2-Step Verification is enabled
- Check that the App Password is copied correctly (no spaces)

### Error: "Connection timeout"
- **Solution**: Check your firewall settings
- Verify the SMTP port (465 for SSL, 587 for TLS)
- Try using port 587 with TLS instead of 465

### Error: "Email service is not properly configured"
- **Solution**: Check that all environment variables are set in your `.env` file
- Verify there are no typos in variable names
- Make sure the `.env` file is in the root of your backend directory

## Testing Email Configuration

You can test your email configuration by:
1. Registering a new user account
2. Checking the server logs for any email errors
3. Verifying the activation email is received

If emails are still not working, check the server console logs for detailed error messages.






