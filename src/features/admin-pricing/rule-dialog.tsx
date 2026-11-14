"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api/client";
import { applyApiError } from "@/lib/api/messages";
import type { AircraftCategory } from "@/lib/api/types";
import {
  appliesTo,
  CATEGORY_OPTIONS,
  configToDraft,
  describeConfig,
  isRuleType,
  listIsStale,
  RULE_META,
  RULE_TYPE_OPTIONS,
  ruleLabel,
  type PricingRule,
  type RuleScope,
  type RuleType,
} from "./rules";
import {
  fieldPaths,
  ruleSchema,
  type RuleFormInput,
  type RuleFormValues,
} from "./schema";

const SCOPE_OPTIONS = [
  { value: "PLATFORM", label: "All aircraft" },
  { value: "CATEGORY", label: "One aircraft category" },
];

const RULES_KEY = ["admin", "pricing-rules"] as const;

export function AddRuleDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<RuleType>("COMMISSION");
  const [scope, setScope] = useState<RuleScope>("CATEGORY");
  const [category, setCategory] = useState<AircraftCategory>("LIGHT_JET");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10">Add rule</Button>
      </DialogTrigger>
      <DialogContent
        title="Add pricing rule"
        description="Takes effect for new estimates at once. Estimates already given keep the rules they were made with."
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        {open ? (
          <div className="flex flex-col gap-4">
            <Select
              label="Rule"
              options={RULE_TYPE_OPTIONS}
              value={type}
              onValueChange={(value) => setType(value as RuleType)}
              className="h-10"
            />
            <p className="-mt-2 text-body-sm text-muted">
              {RULE_META[type].description}
            </p>
            <Select
              label="Applies to"
              options={SCOPE_OPTIONS}
              value={scope}
              onValueChange={(value) => setScope(value as RuleScope)}
              className="h-10"
            />
            {scope === "CATEGORY" ? (
              <Select
                label="Aircraft category"
                options={CATEGORY_OPTIONS}
                value={category}
                onValueChange={(value) =>
                  setCategory(value as AircraftCategory)
                }
                className="h-10"
              />
            ) : null}
            <RuleForm
              key={type}
              type={type}
              target={{
                scope,
                scopeRef: scope === "CATEGORY" ? category : null,
              }}
              onDone={() => setOpen(false)}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function ChangeRuleDialog({
  rule,
  onOpenChange,
}: {
  rule: PricingRule | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={rule !== null} onOpenChange={onOpenChange}>
      <DialogContent
        title={
          rule ? `Change ${ruleLabel(rule.type).toLowerCase()}` : "Change rule"
        }
        description={
          rule
            ? `${appliesTo(rule)}. Now: ${describeConfig(rule.type, rule.config)}. Saving creates version ${rule.version + 1}; estimates already given keep version ${rule.version}.`
            : undefined
        }
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        {rule && isRuleType(rule.type) ? (
          <RuleForm
            type={rule.type}
            rule={rule}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RuleForm({
  type,
  rule,
  target,
  onDone,
}: {
  type: RuleType;
  /** The rule being changed; absent when adding. */
  rule?: PricingRule;
  /** Where a new rule applies; absent when changing. */
  target?: { scope: RuleScope; scopeRef: string | null };
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const meta = RULE_META[type];
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RuleFormInput, unknown, RuleFormValues>({
    resolver: zodResolver(ruleSchema(type)) as unknown as Resolver<
      RuleFormInput,
      unknown,
      RuleFormValues
    >,
    defaultValues: { config: configToDraft(type, rule?.config), reason: "" },
  });

  async function onSubmit(values: RuleFormValues) {
    setFormError(null);
    try {
      if (rule) {
        const saved = await apiFetch<PricingRule>(
          `admin/pricing-rules/${rule.id}`,
          { method: "PATCH", body: values },
        );
        toast({
          title:
            saved.data.id === rule.id
              ? "No change: the settings are the same"
              : `${meta.label} changed`,
          tone: "success",
        });
      } else if (target) {
        await apiFetch<PricingRule>("admin/pricing-rules", {
          method: "POST",
          body: { type, ...target, ...values },
        });
        toast({ title: `${meta.label} added`, tone: "success" });
      }
      void queryClient.invalidateQueries({ queryKey: RULES_KEY });
      onDone();
    } catch (error) {
      if (listIsStale(error)) {
        void queryClient.invalidateQueries({ queryKey: RULES_KEY });
      }
      setFormError(applyApiError(error, setError, fieldPaths(type) as never));
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert message={formError} />
      {meta.fields.map((field) => {
        const error = (
          errors.config as Record<string, { message?: string }> | undefined
        )?.[field.key]?.message;
        if (field.kind === "choice") {
          return (
            <Controller
              key={field.key}
              control={control}
              name={`config.${field.key}`}
              render={({ field: input }) => (
                <Select
                  label={field.label}
                  options={field.options}
                  name={input.name}
                  value={input.value}
                  onValueChange={input.onChange}
                  className="h-10"
                  error={error}
                />
              )}
            />
          );
        }
        return (
          <Input
            key={field.key}
            label={field.label}
            hint={field.hint}
            inputMode={field.kind === "text" ? undefined : "decimal"}
            className="h-10"
            error={error}
            {...register(`config.${field.key}`)}
          />
        );
      })}
      <Textarea
        label="Reason"
        hint="Kept in the audit record with the change."
        rows={2}
        error={errors.reason?.message}
        {...register("reason")}
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" className="h-10">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" className="h-10" loading={isSubmitting}>
          {rule ? "Save new version" : "Add rule"}
        </Button>
      </DialogFooter>
    </form>
  );
}
