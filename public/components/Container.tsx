import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { twx } from "../utils/twx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function Container({
	children,
	className,
	...props
}: { children: React.ReactNode } & React.ComponentProps<"div">) {
	return (
		<div
			className={twx(
				"p-4 rounded-3xl backdrop-blur-md",
				"border border-worder dark:border-worder-dark",
				"bg-wontainer dark:bg-wontainer-dark",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}

export function IconContainer({
	icon,
	className,
	...props
}: { icon: IconProp } & React.ComponentProps<"div">) {
	return (
		<div
			className={twx(
				"w-10 h-10 aspect-square rounded-full backdrop-blur-md",
				"flex items-center justify-center",
				"border border-worder dark:border-worder-dark",
				"bg-wontainer dark:bg-wontainer-dark",
				className,
			)}
			{...props}
		>
			<FontAwesomeIcon icon={icon} />
		</div>
	);
}
