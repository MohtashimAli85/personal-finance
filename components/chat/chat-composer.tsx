import { ArrowUp, Sparkles, Square } from "lucide-react";
import type { FormEvent, KeyboardEvent, RefObject } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "@/components/ui/input-group";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
		<form
			className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-2 pt-2"
			onSubmit={onSubmit}
		>
			<InputGroup className="rounded-2xl bg-card shadow-xs">
				<InputGroupTextarea
					ref={textareaRef}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					onKeyDown={onKeyDown}
					placeholder={placeholder}
					disabled={disabled}
					rows={1}
					className="field-sizing-content max-h-48 min-h-12"
				/>
				<InputGroupAddon align="block-end" className="justify-between">
					<Select
						value={model}
						onValueChange={onModelChange}
						disabled={models.length === 0}
					>
						<SelectTrigger
							size="sm"
							aria-label="Model"
							className="border-0 bg-transparent text-muted-foreground shadow-none hover:text-foreground dark:bg-transparent"
						>
							<Sparkles />
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
						<Tooltip>
							<TooltipTrigger asChild>
								<InputGroupButton
									variant="outline"
									size="icon-sm"
									className="rounded-full"
									onClick={onStop}
									aria-label="Stop"
								>
									{submitted ? (
										<Spinner />
									) : (
										<Square className="fill-current" />
									)}
								</InputGroupButton>
							</TooltipTrigger>
							<TooltipContent>Stop</TooltipContent>
						</Tooltip>
					) : (
						<InputGroupButton
							type="submit"
							variant="default"
							size="icon-sm"
							className="rounded-full"
							disabled={!value.trim() || disabled}
							aria-label="Send"
						>
							<ArrowUp />
						</InputGroupButton>
					)}
				</InputGroupAddon>
			</InputGroup>
			<p className="hidden items-center justify-center gap-1.5 text-xs text-muted-foreground sm:flex">
				<Kbd>Enter</Kbd> to send
				<span aria-hidden>·</span>
				<KbdGroup>
					<Kbd>Shift</Kbd>+<Kbd>Enter</Kbd>
				</KbdGroup>
				for a new line
			</p>
		</form>
	);
}
