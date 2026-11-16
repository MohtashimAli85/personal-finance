import { useId } from "react";
import { cn } from "@/lib/tailwindcss/utils";

const POCKET =
	"M264 500L512 652L760 500L760 744Q760 800 704 800L320 800Q264 800 264 744Z";

export default function BrandLoader({
	className,
	...props
}: React.ComponentProps<"svg">) {
	const id = useId().replace(/[^\w-]/g, "");
	const gap = `${id}-gap`;
	const vein = `${id}-vein`;

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="172 140 680 680"
			role="img"
			aria-label="Loading"
			data-slot="brand-loader"
			className={cn("size-4 shrink-0 text-primary", className)}
			{...props}
		>
			<defs>
				<mask
					id={gap}
					maskUnits="userSpaceOnUse"
					x="0"
					y="0"
					width="1024"
					height="1024"
				>
					<rect width="1024" height="1024" fill="#fff" />
					<path
						d={POCKET}
						fill="#000"
						stroke="#000"
						strokeWidth="84"
						strokeLinejoin="round"
					/>
				</mask>
				<mask
					id={vein}
					maskUnits="userSpaceOnUse"
					x="-200"
					y="-400"
					width="400"
					height="420"
				>
					<rect x="-200" y="-400" width="400" height="420" fill="#fff" />
					<path
						d="M0 -70Q10 -200 0 -300"
						fill="none"
						stroke="#000"
						strokeWidth="20"
						strokeLinecap="round"
					/>
				</mask>
			</defs>
			<g transform="translate(0 -20)" fill="currentColor">
				<g mask={`url(#${gap})`}>
					<rect
						x="244"
						y="420"
						width="536"
						height="380"
						rx="56"
						fillOpacity=".28"
					/>
					<g transform="matrix(0.951057 0.309017 -0.309017 0.951057 512 580)">
						<g className="brand-loader-leaf">
							<path
								d="M0 0C-150 -90 -130 -300 0 -380C130 -300 150 -90 0 0Z"
								mask={`url(#${vein})`}
							/>
						</g>
					</g>
				</g>
				<path
					d={POCKET}
					stroke="currentColor"
					strokeWidth="40"
					strokeLinejoin="round"
				/>
			</g>
		</svg>
	);
}
