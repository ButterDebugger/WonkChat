import MutedText from "../components/MutedText";
import HyperLink from "../components/HyperLink";
import { Container } from "../components/Container";
import logoPng from "/icon.png";
import Button from "../components/Button";
import { Link } from "react-router-dom";

export default function Article({
	children,
	returnHome = false,
}: {
	children: React.ReactNode;
	returnHome?: boolean;
}) {
	return (
		<>
			<div className="flex w-full h-full">
				<div className="min-h-screen flex flex-col justify-center gap-4 flex-1 p-4 max-w-315 m-auto">
					<Header returnHome={returnHome} />
					<div className="flex-1">{children}</div>
					<Footer />
				</div>
			</div>
		</>
	);
}

function Header({ returnHome = false }: { returnHome?: boolean }) {
	return (
		<Container className="flex flex-row items-center gap-4 sticky top-4 z-10">
			<img src={logoPng} className="size-8" />
			<h1 className="font-bold text-3xl font-title">Wonk Chat</h1>
			{returnHome ? (
				<Link to="/" className="ml-auto">
					<Button secondary>Return Home</Button>
				</Link>
			) : (
				<Button className="ml-auto" secondary>
					Open App
				</Button>
			)}
		</Container>
	);
}

function Footer() {
	return (
		<Container className="flex flex-row justify-evenly gap-12">
			<FooterColumn title="Legal">
				<MutedText>
					© 2023 ButterDebugger.
					<br />
					All Rights Reserved.
				</MutedText>
				<MutedText>
					Icons used from <a href="https://fontawesome.com/">Font Awesome</a>.
				</MutedText>
			</FooterColumn>
			<FooterColumn title="Resources">
				<HyperLink to="https://github.com/ButterDebugger/WonkChat/issues">Issues</HyperLink>
				<HyperLink to="https://github.com/ButterDebugger/WonkChat">Source</HyperLink>
			</FooterColumn>
			<FooterColumn title="Policies">
				<HyperLink to="/#">Terms of Service</HyperLink>
				<HyperLink to="/privacy/">Privacy Policy</HyperLink>
			</FooterColumn>
		</Container>
	);
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col items-start gap-2">
			<span className="font-bold text-lg">{title.toUpperCase()}</span>
			{children}
		</div>
	);
}
