import Article from "../layouts/Article";
import MutedText from "../components/MutedText";
import { Container, IconContainer } from "../components/Container";
import { faBolt, faFeather, faLock } from "@fortawesome/free-solid-svg-icons";

export default function Home() {
	return (
		<Article>
			<div className="flex flex-col pl-4 pr-4 pt-12 pb-12 gap-12 items-center">
				<h1 className="bg-linear-to-b from-primary to-secondary bg-clip-text text-transparent text-6xl font-extrabold font-title">
					<p className="pb-2">Wonky Conversations,</p>
					<p className="pb-2">Wonky Connections ❤️</p>
				</h1>
				<h2 className="font-subtitle">
					Just another simplistic and purely anonymous chat app for wonky fellows to chat
					in.
				</h2>
				<div className="flex flex-wrap flex-row justify-center gap-4">
					<Container className="flex flex-col gap-2 max-w-65">
						<IconContainer icon={faLock} />
						<h1 className="font-bold text-2xl font-title">Private</h1>
						<MutedText className="font-subtitle">
							Your chats are only meant for you.
						</MutedText>
					</Container>
					<Container className="flex flex-col gap-2 max-w-65">
						<IconContainer icon={faFeather} />
						<h1 className="font-bold text-2xl font-title">Simple</h1>
						<MutedText className="font-subtitle">
							A straightforward interface for easy communication.
						</MutedText>
					</Container>
					<Container className="flex flex-col gap-2 max-w-65">
						<IconContainer icon={faBolt} />
						<h1 className="font-bold text-2xl font-title">Real-time</h1>
						<MutedText className="font-subtitle">
							Instantly send and receive messages.
						</MutedText>
					</Container>
				</div>
			</div>
		</Article>
	);
}
