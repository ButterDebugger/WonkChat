import { twx } from "../utils/twx";

export default function Input({ className, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type="text"
			className={twx(
				"rounded-3xl pt-2 pb-2 pl-6 pr-6 transition-colors outline-none cursor-text",
				// Background color
				"bg-wontainer-secondary dark:bg-wontainer-secondary-dark",
				// Background color on hover
				"hover:enabled:bg-wontainer-secondary-hover hover:enabled:dark:bg-wontainer-secondary-hover-dark",
				// Background color on active
				"active:enabled:bg-wontainer-secondary-active active:enabled:dark:bg-wontainer-secondary-active-dark",
				// Border styles
				"border border-worder dark:border-worder-dark hover:enabled:border-worder-hover active:enabled:border-worder-hover",
				// Disabled styles
				"disabled:opacity-50 disabled:cursor-not-allowed",
				className,
			)}
			{...props}
		/>
	);
}
