import { useState, useRef, useCallback, useEffect } from "react";
import AsyncSelect from "react-select";
import type { ActionMeta, SingleValue, StylesConfig } from "react-select";

interface Option {
  value: number;
  label: string;
}

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "var(--surface)",
    borderColor: state.isFocused ? "var(--primary)" : "var(--border)",
    boxShadow: state.isFocused ? "0 0 0 2px var(--ring)" : "none",
    minHeight: "2.5rem",
    "&:hover": { borderColor: "var(--border)" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 0.5rem" }),
  input: (base) => ({ ...base, color: "var(--text)", margin: 0, padding: 0 }),
  singleValue: (base) => ({ ...base, color: "var(--text)" }),
  placeholder: (base) => ({ ...base, color: "var(--text-faint)" }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: "var(--border)" }),
  dropdownIndicator: (base) => ({ ...base, color: "var(--text-muted)" }),
  clearIndicator: (base) => ({ ...base, color: "var(--text-muted)" }),
  loadingIndicator: (base) => ({ ...base, color: "var(--text-muted)" }),
  menu: (base) => ({
    ...base,
    backgroundColor: "var(--surface)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-overlay, 0 8px 24px rgba(0,0,0,0.18))",
    zIndex: 60,
  }),
  menuList: (base) => ({ ...base, backgroundColor: "var(--surface)" }),
  menuPortal: (base) => ({ ...base, zIndex: 60, pointerEvents: "auto" }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "var(--primary)"
      : state.isFocused
        ? "var(--surface-2)"
        : "transparent",
    color: state.isSelected ? "var(--primary-foreground)" : "var(--text)",
    cursor: "pointer",
    "&:active": { backgroundColor: "var(--surface-2)" },
  }),
  noOptionsMessage: (base) => ({ ...base, color: "var(--text-muted)" }),
  loadingMessage: (base) => ({ ...base, color: "var(--text-muted)" }),
};

interface Props {
  name?: string;
  value: string | number | null;
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
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const inputRef = useRef("");
  const loadingRef = useRef(false);
  const initializedRef = useRef(false);

  const load = useCallback((input: string, page: number, append: boolean) => {
    if (loadingRef.current && !append) return;
    loadingRef.current = true;
    setLoading(!append);

    loadOptions(input, page).then(result => {
      if (append) {
        setOptions(prev => [...prev, ...result.options]);
      } else {
        setOptions(result.options);
      }
      setHasMore(result.hasMore);
      pageRef.current = page;
      inputRef.current = input;
      loadingRef.current = false;
    }).catch(() => {
      loadingRef.current = false;
    }).finally(() => {
      setLoading(false);
    });
  }, [loadOptions]);

  // Initial load on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    load("", 1, false);
  }, [load]);

  const handleChange = (
    newValue: SingleValue<Option>,
    _actionMeta: ActionMeta<Option>
  ) => {
    onChange(newValue?.value ?? null);
  };

  const handleInputChange = (input: string) => {
    pageRef.current = 1;
    load(input, 1, false);
  };

  const handleMenuScrollToBottom = () => {
    if (hasMore && !loadingRef.current) {
      load(inputRef.current, pageRef.current + 1, true);
    }
  };

  return (
    <div className="space-y-1">
      <AsyncSelect
        options={options}
        value={options.find(o => o.value === value) || null}
        onChange={handleChange}
        onInputChange={handleInputChange}
        onMenuScrollToBottom={handleMenuScrollToBottom}
        placeholder={placeholder}
        isSearchable
        isDisabled={isDisabled}
        loadingMessage={() => "Cargando..."}
        noOptionsMessage={() => loading ? "Cargando..." : "Sin opciones"}
        isLoading={loading}
        styles={selectStyles}
        classNamePrefix="rs"
        menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
        menuShouldBlockScroll
      />
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}