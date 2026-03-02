import React from 'react'
import { Link } from 'react-router-dom'
import { navItems as defaultNavItems } from '../../static/data'
import styles from '../../styles/styles'


const sortNavItems = (items = []) =>
    [...items].sort((a, b) => {
        const orderA = typeof a.order === "number" ? a.order : 0;
        const orderB = typeof b.order === "number" ? b.order : 0;
        if (orderA === orderB) {
            return 0;
        }
        return orderA - orderB;
    });

const Navbar = ({ active, items }) => {
    const navList = (items && items.length ? items : defaultNavItems).map((item, index) => ({
        ...item,
        _originalIndex: index,
    }));

    const sortedNav = items && items.length ? sortNavItems(navList) : navList;

    return (
        <div className={`block 800px:${styles.noramlFlex}`}>
            {sortedNav.map((item, index) => {
                const isActive =
                    typeof active === "number"
                        ? active === index + 1
                        : item.url === active;

                const linkTarget = item.target || "_self";
                const linkUrl = item.url || "/";
                const isExternal =
                    linkUrl.startsWith("http://") ||
                    linkUrl.startsWith("https://") ||
                    linkUrl.startsWith("mailto:") ||
                    linkUrl.startsWith("tel:");

                const linkClass = `${isActive ? "text-[#CCBEA1]" : "text-black 800px:text-[#fff]"} pb-[30px] 800px:pb-0 font-[500] px-6 cursor-pointer}`;

                return (
                    <div className='flex' key={`${linkUrl}-${index}`}>
                        {isExternal ? (
                            <a
                                href={linkUrl}
                                target={linkTarget}
                                rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined}
                                className={linkClass}
                            >
                                {item.title}
                            </a>
                        ) : (
                            <Link
                                to={linkUrl}
                                target={linkTarget}
                                rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined}
                                className={linkClass}
                            >
                                {item.title} - push
                            </Link>
                        )}
                    </div>
                );
            })}
        </div>
    )
}

export default Navbar