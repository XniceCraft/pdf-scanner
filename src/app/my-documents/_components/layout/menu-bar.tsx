"use client";

import { Input } from "@/components/ui/input";
import {
  debounce,
  throttle,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusIcon, XIcon } from "lucide-react";

type SortEnum =
  | "name-asc"
  | "name-desc"
  | "updatedAt-desc"
  | "updatedAt-asc"
  | "createdAt-desc"
  | "createdAt-asc";

export function MenuBar() {
  const [state, setState] = useQueryStates(
    {
      search: parseAsString.withDefault(""),
      sort: parseAsStringEnum([
        "name-asc",
        "name-desc",
        "updatedAt-desc",
        "updatedAt-asc",
        "createdAt-desc",
        "createdAt-asc",
      ]).withDefault("updatedAt-desc"),
    },
    {
      history: "push",
      shallow: false,
      limitUrlUpdates: throttle(500),
    }
  );

  return (
    <nav className="p-4 bg-white/5 border-b flex flex-nowrap gap-3">
      <div className="relative w-full">
        <Input
          placeholder="Search documents"
          value={state.search}
          onChange={(e) =>
            setState(
              { search: e.target.value },
              {
                limitUrlUpdates:
                  e.target.value === "" ? undefined : debounce(500),
              }
            )
          }
        />
        {state.search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setState({ search: "" })}
          >
            <XIcon />
          </Button>
        )}
      </div>
      <Select
        value={state.sort}
        onValueChange={(value) => setState({ sort: value as SortEnum })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent position="item-aligned">
          <SelectGroup>
            <SelectItem value="name-asc">Name - Ascending</SelectItem>
            <SelectItem value="name-desc">Name - Descending</SelectItem>
            <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
            <SelectItem value="updatedAt-asc">Oldest Updated</SelectItem>
            <SelectItem value="createdAt-desc">Newest Created</SelectItem>
            <SelectItem value="createdAt-asc">Oldest Created</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button asChild>
        <Link href="/">
          <PlusIcon /> New Scan
        </Link>
      </Button>
    </nav>
  );
}
