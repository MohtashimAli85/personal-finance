import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DATE_FORMATS } from "@/lib/csv";

const DELIMITER_OPTIONS = [
	{ value: ",", label: "Comma (,)" },
	{ value: ";", label: "Semicolon (;)" },
	{ value: "\t", label: "Tab" },
	{ value: "|", label: "Pipe (|)" },
];

export default function ImportOptions({
	dateFormat,
	onDateFormatChange,
	delimiter,
	onDelimiterChange,
	hasHeader,
	onHasHeaderChange,
	flipAmount,
	onFlipAmountChange,
}: {
	dateFormat: string;
	onDateFormatChange: (value: string) => void;
	delimiter: string;
	onDelimiterChange: (value: string) => void;
	hasHeader: boolean;
	onHasHeaderChange: (value: boolean) => void;
	flipAmount: boolean;
	onFlipAmountChange: (value: boolean) => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<Label className="w-24 shrink-0">Date format</Label>
					<Select value={dateFormat} onValueChange={onDateFormatChange}>
						<SelectTrigger size="sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{DATE_FORMATS.map((f) => (
								<SelectItem key={f} value={f}>
									{f}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-3">
					<Label className="w-24 shrink-0">Delimiter</Label>
					<Select value={delimiter} onValueChange={onDelimiterChange}>
						<SelectTrigger size="sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{DELIMITER_OPTIONS.map((d) => (
								<SelectItem key={d.value} value={d.value}>
									{d.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="space-y-3">
				<Label className="flex items-center gap-2">
					<Checkbox
						checked={hasHeader}
						onCheckedChange={(v) => onHasHeaderChange(v === true)}
					/>
					File has header row
				</Label>
				<Label className="flex items-center gap-2">
					<Checkbox
						checked={flipAmount}
						onCheckedChange={(v) => onFlipAmountChange(v === true)}
					/>
					Flip amount sign
				</Label>
			</div>
		</div>
	);
}
