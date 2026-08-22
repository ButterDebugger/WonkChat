import { Link, type LinkProps } from "react-router-dom";
import { twx } from "../utils/twx";

export default function HyperLink({ to, children, className, ...props }: LinkProps) {
	return (
		<Link
			to={to}
			className={twx("text-primary-muted hover:underline cursor-pointer", className)}
			{...props}
		>
			{children}
		</Link>
	);
}
