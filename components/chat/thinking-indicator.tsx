import BrandLoader from "@/components/brand-loader";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";

export default function ThinkingIndicator() {
	return (
		<Marker role="status">
			<MarkerIcon>
				<BrandLoader />
			</MarkerIcon>
			<MarkerContent className="shimmer">Thinking…</MarkerContent>
		</Marker>
	);
}
