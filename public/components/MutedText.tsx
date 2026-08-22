import { twx } from "../utils/twx";

export default function MutedText({ children, className, ...props }: React.ComponentProps<"span">) {
	return (
		<span className={twx("text-wext-muted dark:text-wext-muted-dark", className)} {...props}>
			{children}
		</span>
	);
}
