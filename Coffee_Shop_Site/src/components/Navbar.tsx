import { useRef, useState } from "react";
import {
    IoMenuOutline as MenuOutline,
} from "react-icons/io5";
import logo from "../assets/images/logo.svg";
import { navItems } from "../data";

const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);
    return (
        <nav
            data-entrance
            aria-label="Main navigation"
            className="w-full flex flex-col"
            onKeyDown={(event) => {
                if (event.key === "Escape" && menuOpen) {
                    setMenuOpen(false);
                    menuButton.current?.focus();
                }
            }}
        >
            <div className="w-full bg-transparent border-b border-border lg:px-[310px] px-5 flex items-center justify-between h-[40px]">
                <span className="text-secondary font-Source">
                    Tired? Let’s have a cup of coffee.
                </span>
                <span className="text-secondary font-Source">
                    Call us: +47 91 54 95 51
                </span>
                <span className="text-secondary font-Source lg:block hidden">
                    Our location: Jernbanetorget 1, Norway
                </span>
            </div>

            <div className="w-full flex items-center justify-between h-[73px] lg:px-[310px] px-5">
                <img src={logo} alt="Coffee shop logo" />

                <div className="hidden lg:flex items-center gap-12">
                    {navItems.map((item) => (
                        <a
                            href={item.path}
                            key={item.title}
                            className={`font-Source text-lg ${
                                item.active
                                    ? "text-primary"
                                    : "text-secondary"
                            }`}
                        >
                            {item.title}
                        </a>
                    ))}
                </div>

                <button
                    ref={menuButton}
                    type="button"
                    className="block lg:hidden text-secondary p-1"
                    aria-label={menuOpen ? "Close navigation" : "Open navigation"}
                    aria-expanded={menuOpen}
                    aria-controls="mobile-navigation"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    <MenuOutline aria-hidden="true" size={35} />
                </button>
            </div>
            <div
                id="mobile-navigation"
                hidden={!menuOpen}
                className="lg:hidden border-t border-border bg-fill px-5 py-4"
            >
                <div className="flex flex-col gap-4">
                    {navItems.map((item) => (
                        <a
                            href={item.path}
                            key={item.title}
                            className={`font-Source text-lg ${item.active ? "text-primary" : "text-secondary"}`}
                            onClick={() => {
                                setMenuOpen(false);
                                if (item.path.startsWith("#")) {
                                    document.getElementById(item.path.slice(1))?.focus({ preventScroll: true });
                                } else {
                                    menuButton.current?.focus();
                                }
                            }}
                        >
                            {item.title}
                        </a>
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
