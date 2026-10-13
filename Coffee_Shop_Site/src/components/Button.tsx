import type { MouseEventHandler } from "react";

interface Props {
    children: string;
    className?: string;
    href?: string;
    type?: "button" | "submit" | "reset";
    onClick?: MouseEventHandler<HTMLButtonElement>;
    disabled?: boolean;
}

const Button = ({children, className = "", href, type = "button", onClick, disabled}: Props) => {
  const styles = `${className} inline-flex items-center justify-center h-[47px] bg-primary rounded-[100px] font-Source text-white text-lg tracking-wider uppercase w-fit px-7`;

  return href ? (
    <a href={href} className={styles}>{children}</a>
  ) : (
    <button type={type} onClick={onClick} disabled={disabled} className={`${styles} disabled:opacity-60`}>{children}</button>
  );
};

export default Button;
