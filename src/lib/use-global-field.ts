import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

/** Starts as the global value. Typing in the box keeps your edit. Changing the global later only updates a box you have not typed in. */
export function useGlobalField(globalValue: string, fallback = ""): [string, Dispatch<SetStateAction<string>>] {
  const [value, setValue] = useState(globalValue || fallback);
  const edited = useRef(false);
  useEffect(() => {
    if (!edited.current) setValue(globalValue || fallback);
  }, [globalValue, fallback]);
  const set: Dispatch<SetStateAction<string>> = (next) => {
    edited.current = true;
    setValue(next);
  };
  return [value, set];
}
