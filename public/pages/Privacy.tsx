import Article from "../layouts/Article";
import MutedText from "../components/MutedText";
import HyperLink from "../components/HyperLink";

export default function Privacy() {
	return (
		<Article returnHome={true}>
			<div className="flex flex-col pl-4 pr-4 pt-12 pb-12 gap-12 items-center text-center">
				<h1 className="text-6xl font-extrabold font-title">Privacy Policy</h1>
				<h2 className="font-subtitle">
					Wonk Chat was built with your privacy in mind.
					<br />
					We understand your privacy is important to you so please take the time to read
					through it.
				</h2>
				<div className="grid grid-cols-2 max-[600px]:grid-cols-1 gap-12 justify-center">
					<div className="max-w-100">
						<h3 className="font-bold font-title">Information we collect</h3>
						<MutedText className="font-subtitle">
							We do not collect any of your personal information. We only collect
							friendly statistics about our site provided by{" "}
							<HyperLink to="https://www.cloudflare.com/web-analytics/">
								CloudFlare's web analytics
							</HyperLink>
							.
						</MutedText>
					</div>
					<div className="max-w-100">
						<h3 className="font-bold font-title">Changes to this policy</h3>
						<MutedText className="font-subtitle">
							We may update this privacy policy from time to time. Any changes will be
							posted on this page, so please check back periodically to stay informed
							about how we are protecting your information.
						</MutedText>
					</div>
					<div className="max-w-100">
						<h3 className="font-bold font-title">Data security</h3>
						<MutedText className="font-subtitle">
							We are committed to ensuring the security of your information. All of
							your data is stored locally in your browser and stays on your device,
							not to be sent to us or any third party.
						</MutedText>
					</div>
					<div className="max-w-100">
						<h3 className="font-bold font-title">Contact us</h3>
						<MutedText className="font-subtitle">
							If you have any questions or concerns about our privacy policy or the
							way we handle your information, please feel free to contact us at{" "}
							<HyperLink to="mailto:contact@debutter.dev">
								contact@debutter.dev
							</HyperLink>
							.
						</MutedText>
					</div>
				</div>
				<p>By using Wonk Chat, you agree to the terms of this privacy policy.</p>
			</div>
		</Article>
	);
}
