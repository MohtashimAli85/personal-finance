"use client";

import { useFormStatus } from "react-dom";
import { Button } from "../ui/button";

export default function CloseAccountSubmit() {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" disabled={pending}>
			{pending ? "Closing..." : "Close Account"}
		</Button>
	);
}
