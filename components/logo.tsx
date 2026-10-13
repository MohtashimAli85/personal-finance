const ENVELOPE_FRONT =
	"M264 500L512 652L760 500L760 744Q760 800 704 800L320 800Q264 800 264 744Z";
const LEAF_TRANSFORM = "matrix(0.951057 0.309017 -0.309017 0.951057 512 580)";

export default function Logo({ className }: { className?: string }) {
	return (
		<svg viewBox="244 190 536 610" className={className} aria-hidden="true">
			<defs>
				<mask
					id="logo-front-cutout"
					maskUnits="userSpaceOnUse"
					width="1024"
					height="1024"
				>
					<rect x="0" y="0" width="1024" height="1024" fill="white" />
					<path
						d={ENVELOPE_FRONT}
						stroke="black"
						strokeWidth="84"
						strokeLinejoin="round"
					/>
				</mask>
				<mask
					id="logo-leaf-vein"
					maskUnits="userSpaceOnUse"
					width="1024"
					height="1024"
				>
					<rect x="0" y="0" width="1024" height="1024" fill="white" />
					<path
						transform={LEAF_TRANSFORM}
						d="M0 -70Q10 -200 0 -300"
						fill="none"
						stroke="black"
						strokeWidth="20"
						strokeLinecap="round"
					/>
				</mask>
			</defs>
			<g transform="translate(0 -20)">
				<g mask="url(#logo-front-cutout)">
					<rect
						className="fill-primary/25"
						x="244"
						y="420"
						width="536"
						height="380"
						rx="56"
					/>
					<g mask="url(#logo-leaf-vein)">
						<path
							className="fill-primary"
							transform={LEAF_TRANSFORM}
							d="M0 0C-150 -90 -130 -300 0 -380C130 -300 150 -90 0 0Z"
						/>
					</g>
				</g>
				<path
					className="fill-primary stroke-primary"
					d={ENVELOPE_FRONT}
					strokeWidth="40"
					strokeLinejoin="round"
				/>
			</g>
		</svg>
	);
}
