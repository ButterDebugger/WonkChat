import { twx } from "../utils/twx";

export default function Button({
	secondary = false,
	children,
	className,
	...props
}: { secondary?: boolean } & React.ComponentProps<"button">) {
	return (
		<button
			className={twx(
				"rounded-3xl pt-2 pb-2 pl-6 pr-6 transition-colors cursor-pointer",
				// Background color
				secondary
					? "bg-wontainer-secondary dark:bg-wontainer-secondary-dark"
					: "bg-wontainer dark:bg-wontainer-dark",
				// Background color on hover
				secondary
					? "hover:enabled:bg-wontainer-secondary-hover hover:enabled:dark:bg-wontainer-secondary-hover-dark"
					: "hover:enabled:bg-wontainer-hover hover:enabled:dark:bg-wontainer-hover-dark",
				// Background color on active
				secondary
					? "active:enabled:bg-wontainer-secondary-active active:enabled:dark:bg-wontainer-secondary-active-dark"
					: "active:enabled:bg-wontainer-active active:enabled:dark:bg-wontainer-active-dark",
				// Border styles
				"border border-worder dark:border-worder-dark hover:enabled:border-worder-hover active:enabled:border-worder-hover",
				// Disabled styles
				"disabled:opacity-50 disabled:cursor-not-allowed",
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}
