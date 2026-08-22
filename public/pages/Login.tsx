import { useSearchParams } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import Centered from "../layouts/Centered";
import { createRef, useState } from "react";

export default function Login() {
	const [searchParams, _] = useSearchParams();
	const [usernameWarning, setUsernameWarning] = useState("");
	const [passwordWarning, setPasswordWarning] = useState("");
	const [submittable, setSubmittable] = useState(false);

	// Make sure callback is a valid url
	const callback = searchParams.get("callback");
	let callbackUrl: URL;

	try {
		callbackUrl = new URL(callback as string); // NOTE: Throws an error if the callback url is invalid
	} catch {
		return (
			<Centered>
				<h1 className="self-center text-center font-bold text-6xl text-warning">
					Invalid OAuth Callback URL
				</h1>
			</Centered>
		);
	}

	// Make sure challenge and state are present
	const challenge = searchParams.get("challenge");
	const state = searchParams.get("state");

	if (!challenge || !state) {
		return (
			<Centered>
				<h1 className="self-center text-center font-bold text-6xl text-warning">
					Invalid OAuth Challenge or State
				</h1>
			</Centered>
		);
	}

	// Handle form submission
	const usernameRef = createRef<HTMLInputElement>();
	const passwordRef = createRef<HTMLInputElement>();
	const trustedRef = createRef<HTMLInputElement>();

	const updateSubmittable = () =>
		setSubmittable(
			!!(
				usernameRef.current?.validity.valid &&
				passwordRef.current?.validity.valid &&
				trustedRef.current?.checked
			),
		);

	return (
		<Centered>
			<h1 className="self-center font-bold text-4xl">Login</h1>

			<form
				autoComplete="on"
				className="flex flex-col justify-center gap-2"
				onSubmit={(event) => event.preventDefault()}
			>
				<div className="flex flex-col gap-1">
					<div className="text-[0.875rem]/[1.2lh] flex gap-4">
						<label className="font-bold" htmlFor="username">
							Username
						</label>
						<span className="text-warning italic">{usernameWarning}</span>
					</div>
					<Input
						type="text"
						name="username"
						id="username"
						minLength={3}
						maxLength={16}
						pattern="^(?! )[\x20-\x7E]{3,16}(?<! )$"
						autoComplete="username"
						spellCheck={false}
						required
						ref={usernameRef}
						onInput={() => {
							if (
								usernameRef.current?.value !== "" &&
								usernameRef.current?.validity.valid === false
							) {
								setUsernameWarning(
									"Username must be between 3 and 16 characters long", // TODO: Make this more descriptive
								);
							} else {
								setUsernameWarning("");
							}

							updateSubmittable();
						}}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="text-[0.875rem]/[1.2lh] flex gap-4">
						<label className="font-bold" htmlFor="password">
							Password
						</label>
						<span className="text-warning italic">{passwordWarning}</span>
					</div>
					<Input
						type="password"
						name="password"
						id="password"
						minLength={6}
						autoComplete="current-password"
						spellCheck={false}
						required
						ref={passwordRef}
						onInput={() => {
							if (
								passwordRef.current?.value !== "" &&
								passwordRef.current?.validity.valid === false
							) {
								setPasswordWarning("Password must be longer than 6 characters");
							} else {
								setPasswordWarning("");
							}

							updateSubmittable();
						}}
					/>
				</div>
				<div className="flex flex-row-reverse justify-end items-center gap-2">
					<label className="text-[0.875rem]/[1.2lh] font-bold" htmlFor="trusted">
						I trust <span>{callbackUrl.origin}</span> to act on my behalf
					</label>
					<input
						type="checkbox"
						name="trusted"
						id="trusted"
						required
						ref={trustedRef}
						onInput={() => updateSubmittable()}
					/>
				</div>

				<Button type="submit" id="submit" disabled={!submittable}>
					Submit
				</Button>
			</form>
		</Centered>
	);
}

// const errorMessageEle = document.getElementById("error-message");
// const formEle = document.querySelector("form");
// const usernameEle = document.getElementById("username");
// const passwordEle = document.getElementById("password");
// const trustChk = document.getElementById("trust");
// const trustedOriginEle = document.getElementById("trusted-origin");
// const submitBtn = document.getElementById("submit");

// formEle.addEventListener("submit", (event) => {
//     event.preventDefault();

//     const ogText = submitBtn.innerText;

//     submitBtn.disabled = true;
//     usernameEle.disabled = true;
//     passwordEle.disabled = true;
//     trustChk.disabled = true;
//     errorMessageEle.innerText = "";

//     function restoreInputs() {
//         submitBtn.innerText = ogText;
//         submitBtn.disabled = false;
//         usernameEle.disabled = false;
//         passwordEle.disabled = false;
//         trustChk.disabled = false;
//     }

//     function requestErrorHandler(err, defaultMessage = "Something went wrong") {
//         errorMessageEle.innerText = err?.response?.data?.message ?? defaultMessage;
//         restoreInputs();
//     }

//     submitBtn.innerText = "Authorizing";

//     axios
//         .post("/auth/authorize", {
//             username: usernameEle.value,
//             password: passwordEle.value,
//             challenge: params.get("challenge"),
//         })
//         .then((res) => {
//             if (res.status !== 200 || res?.data?.error) {
//                 return requestErrorHandler(null, res.data.message);
//             }

//             const redirectUrl = `${callbackUrl}?state=${params.get("state")}`;

//             location.href = `./close/?redirect=${encodeURIComponent(redirectUrl)}`;
//         })
//         .catch((err) =>
//             requestErrorHandler(err, "Something went wrong whilst authorizing"),
//         );
// });
