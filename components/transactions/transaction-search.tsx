import { SearchIcon } from "lucide-react";
import { useQueryState } from "@/hooks/use-query-state";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";

const TransactionSearch = () => {
  const [search, setSearch] = useQueryState("search");
  return (
    <InputGroup className="max-w-sm">
      <InputGroupInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search"
      />
      <InputGroupAddon align="inline-start">
        <SearchIcon className="text-muted-foreground" />
      </InputGroupAddon>
    </InputGroup>
  );
};

export default TransactionSearch;
