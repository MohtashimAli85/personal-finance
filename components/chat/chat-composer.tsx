import { ArrowUp, Square } from "lucide-react";
import type { FormEvent, KeyboardEvent, RefObject } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "@/components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { AUTO_MODEL, modelLabel } from "@/lib/ai/labels";
import type { ModelEntry } from "@/lib/ai/models";

export default function ChatComposer({
	value,
	onChange,
	onKeyDown,
	onSubmit,
	textareaRef,
	busy,
	submitted,
	onStop,
	disabled,
	placeholder,
	models,
	model,
	onModelChange,
}: {
	value: string;
	onChange: (value: string) => void;
	onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
	onSubmit: (event: FormEvent) => void;
	textareaRef: RefObject<HTMLTextAreaElement | null>;
	busy: boolean;
	submitted: boolean;
	onStop: () => void;
	disabled: boolean;
	placeholder: string;
	models: ModelEntry[];
	model: string;
	onModelChange: (model: string) => void;
}) {
	return (
		<form className="mx-auto w-full max-w-3xl px-2 pt-2" onSubmit={onSubmit}>
			<InputGroup>
				<InputGroupTextarea
					ref={textareaRef}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					onKeyDown={onKeyDown}
					placeholder={placeholder}
					disabled={disabled}
					rows={1}
					className="field-sizing-content max-h-48 min-h-10"
				/>
				<InputGroupAddon align="block-end" className="justify-between">
					<Select value={model} onValueChange={onModelChange}>
						<SelectTrigger
							size="sm"
							className="border-0 bg-transparent shadow-none"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent align="start">
							<SelectItem value={AUTO_MODEL}>Auto</SelectItem>
							{models.map((entry) => (
								<SelectItem key={entry.model} value={entry.model}>
									{modelLabel(entry.model)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{busy ? (
						<InputGroupButton
							variant="outline"
							size="icon-sm"
							onClick={onStop}
							aria-label="Stop"
						>
							{submitted ? <Spinner /> : <Square />}
						</InputGroupButton>
					) : (
						<InputGroupButton
							type="submit"
							variant="default"
							size="icon-sm"
							disabled={!value.trim() || disabled}
							aria-label="Send"
						>
							<ArrowUp />
						</InputGroupButton>
					)}
				</InputGroupAddon>
			</InputGroup>
		</form>
	);
}
