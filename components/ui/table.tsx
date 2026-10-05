"use client";

import type * as React from "react";
import { forwardRef } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/tailwindcss/utils";

const Table = forwardRef<
  HTMLDivElement,
  React.ComponentProps<"table"> & { scrollbarOutside?: boolean }
>(({ className, scrollbarOutside, ...props }, ref) => {
  return (
    <ScrollArea
      ref={ref}
      data-slot="table-container"
      className="relative min-h-0 w-full flex-1 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-20 before:h-px before:bg-border"
      scrollbarClassName="!top-10"
    >
      <div
        className={cn(
          "min-w-full pb-3",
          scrollbarOutside && "w-[calc(100%-1.5rem)] min-w-0",
        )}
      >
        <table
          data-slot="table"
          className={cn(
            "w-full caption-bottom text-sm [&_th:last-child]:pr-4 [&_td:last-child]:pr-4",
            className,
          )}
          {...props}
        />
      </div>
    </ScrollArea>
  );
});
Table.displayName = "Table";

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b-0", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground sticky top-0 z-10 h-10 bg-background px-2 text-left align-middle font-medium whitespace-nowrap before:absolute before:-top-px before:inset-x-0 before:h-px before:bg-background after:pointer-events-none after:absolute after:-bottom-px after:inset-x-0 after:h-px after:bg-background [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-px align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
