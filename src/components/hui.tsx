"use client";

import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Switch,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { useState, type ReactNode } from "react";

export function HuiMenu({
  label,
  items,
}: {
  label: string;
  items: Array<{ href?: string; onClick?: () => void; label: string }>;
}) {
  return (
    <Menu>
      <MenuButton className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 sans text-sm hover:border-teal-700">
        {label}
        <ChevronDownIcon className="size-4 fill-[var(--muted)]" />
      </MenuButton>
      <MenuItems
        anchor="bottom start"
        className="z-50 mt-1 w-52 rounded-md border border-[var(--line)] bg-[var(--panel)] p-1 shadow-lg"
      >
        {items.map((item) => (
          <MenuItem key={item.label}>
            {item.href ? (
              <a className="block rounded px-3 py-2 sans text-sm data-focus:bg-teal-800 data-focus:text-[var(--accent-ink)]" href={item.href}>
                {item.label}
              </a>
            ) : (
              <button
                type="button"
                className="block w-full rounded px-3 py-2 text-left sans text-sm data-focus:bg-teal-800 data-focus:text-[var(--accent-ink)]"
                onClick={item.onClick}
              >
                {item.label}
              </button>
            )}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

export function HuiSelect({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange?: (value: string) => void;
}) {
  const [selected, setSelected] = useState(value || options[0]?.value || "");
  return (
    <>
      <input type="hidden" name={name} value={selected} />
      <Listbox
        value={selected}
        onChange={(next) => {
          setSelected(next);
          onChange?.(next);
        }}
      >
        <ListboxButton className="relative w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-left sans text-sm dark:bg-stone-900">
          {options.find((o) => o.value === selected)?.label ?? "Select"}
          <ChevronDownIcon className="absolute top-2.5 right-2 size-4 fill-[var(--muted)]" />
        </ListboxButton>
        <ListboxOptions
          anchor="bottom"
          className="z-50 mt-1 w-[var(--button-width)] rounded-md border border-[var(--line)] bg-[var(--panel)] p-1 shadow-lg"
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="cursor-pointer rounded px-3 py-2 sans text-sm data-focus:bg-teal-800 data-focus:text-[var(--accent-ink)]"
            >
              {option.label}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </>
  );
}

export function HuiSwitch({
  name,
  defaultChecked,
  label,
}: {
  name: string;
  defaultChecked?: boolean;
  label: string;
}) {
  const [enabled, setEnabled] = useState(Boolean(defaultChecked));
  return (
    <label className="flex items-center justify-between gap-3 sans text-sm">
      <span>{label}</span>
      <input type="hidden" name={name} value={enabled ? "on" : "off"} />
      <Switch
        checked={enabled}
        onChange={setEnabled}
        className="group relative flex h-6 w-11 cursor-pointer rounded-full bg-stone-300 p-1 transition data-checked:bg-teal-800"
      >
        <span className="size-4 rounded-full bg-white transition group-data-checked:translate-x-5" />
      </Switch>
    </label>
  );
}

export function HuiTabs({
  tabs,
}: {
  tabs: Array<{ id: string; label: string; content: ReactNode }>;
}) {
  return (
    <TabGroup>
      <TabList className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            className="rounded-md px-3 py-2 sans text-sm text-[var(--muted)] data-selected:bg-teal-800 data-selected:text-[var(--accent-ink)]"
          >
            {tab.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {tabs.map((tab) => (
          <TabPanel key={tab.id}>{tab.content}</TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}

export function HuiDialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <div className="mt-4">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
