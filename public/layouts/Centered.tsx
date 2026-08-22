export default function Centered({ children }: { children: React.ReactNode }) {
	return (
		<>
			<div className="flex w-full h-full">
				<div className="min-h-screen flex flex-col justify-center gap-4 flex-1 p-4 max-w-160 m-auto">
					{children}
				</div>
			</div>
		</>
	);
}
