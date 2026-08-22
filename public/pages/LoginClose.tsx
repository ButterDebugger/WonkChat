import { Link, useSearchParams } from "react-router-dom";
import Button from "../components/Button";
import Centered from "../layouts/Centered";

export default function Login() {
	const [searchParams, _] = useSearchParams();
	const redirect = searchParams.get("redirect");

	return (
		<Centered>
			<h1 className="self-center font-bold text-[30px] mb-4">Login Successful</h1>
			{redirect ? (
				<Link to={decodeURIComponent(redirect)}>
					<Button className="w-full">Continue</Button>
				</Link>
			) : (
				<Button disabled>Continue</Button>
			)}
		</Centered>
	);
}
