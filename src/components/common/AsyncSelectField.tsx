import { useState, useCallback } from "react";
import AsyncSelect from "react-select";
import type { ActionMeta, SingleValue } from "react-select";

interface Option {
  value: number;
  label: string;
}

interface Props {
  name?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  loadOptions: (input: string, page: number) => Promise<{ options: Option[]; hasMore: boolean }>;
  placeholder?: string;
  error?: string;
  isDisabled?: boolean;
}

export default function AsyncSelectField({
  value,
  onChange,
  loadOptions,
  placeholder = "Buscar...",
  error,
  isDisabled = false,
}: Props) {
  const [options, setOptions] = useState<Option[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(
    async (inputValue: string, pageNum: number) => {
      setLoading(true);
      try {
        const result = await loadOptions(inputValue, pageNum);
        if (pageNum === 1) {
          setOptions(result.options);
        } else {
          setOptions(prev => [...prev, ...result.options]);
        }
        setHasMore(result.hasMore);
        setPage(pageNum);
      } finally {
        setLoading(false);
      }
    },
    [loadOptions]
  );

  const handleInputChange = (newInput: string) => {
    setInput(newInput);
    setPage(1);
    loadMore(newInput, 1);
  };

  const handleChange = (
    newValue: SingleValue<Option>,
    _actionMeta: ActionMeta<Option>
  ) => {
    onChange(newValue?.value ?? null);
  };

  return (
    <div className="space-y-1">
      <AsyncSelect
        value={options.find(o => o.value === value) || null}
        onChange={handleChange}
        onInputChange={handleInputChange}
        onMenuScrollToBottom={() => {
          if (hasMore && !loading) {
            loadMore(input, page + 1);
          }
        }}
        placeholder={placeholder}
        isSearchable
        defaultOptions
        cacheOptions
        isDisabled={isDisabled}
        loadingMessage={() => "Cargando..."}
        noOptionsMessage={() => "Sin opciones"}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}