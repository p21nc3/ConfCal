import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (value: string[]) => void;
}

export function MultiSelect({ options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Ensure arrays are valid and unique
  const validOptions = React.useMemo(() => 
    Array.from(new Set(options || [])).filter(Boolean),
    [options]
  );

  const validSelected = React.useMemo(() => 
    (selected || []).filter(item => validOptions.includes(item)),
    [selected, validOptions]
  );

  // Filter options based on search
  const filteredOptions = React.useMemo(() => 
    validOptions.filter(option => 
      option.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [validOptions, searchQuery]
  );

  const toggleOption = (option: string) => {
    const newSelected = validSelected.includes(option)
      ? validSelected.filter(item => item !== option)
      : [...validSelected, option];
    onChange(newSelected);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex flex-wrap gap-1 max-w-[90%]">
            {validSelected.length === 0 ? (
              <span className="text-muted-foreground">Select tags...</span>
            ) : (
              validSelected.map(tag => (
                <Badge 
                  key={tag}
                  variant="secondary"
                  className="mr-1"
                >
                  {tag}
                </Badge>
              ))
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="p-2">
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-2"
          />
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {filteredOptions.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No tags found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option}
                    onClick={() => toggleOption(option)}
                    className={cn(
                      "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer",
                      "hover:bg-accent hover:text-accent-foreground",
                      validSelected.includes(option) && "bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        validSelected.includes(option) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}