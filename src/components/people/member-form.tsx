"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/forms/date-picker"
import { Input } from "@/components/ui/input"
import { ENGAGEMENT_TYPE_LABELS, type EngagementType } from "@/config/domain"
import { SYSTEM_ROLE_LABELS, type SystemRole } from "@/config/roles"
import type { Option } from "@/lib/options"
import { inviteMember, updateMember } from "@/server/modules/people/actions"

export interface MemberFormDefaults {
  userId: string
  name: string
  email: string
  role: SystemRole
  engagementType: EngagementType
  employeeCode: string | null
  phone: string | null
  department: Option | null
  designation: Option | null
  manager: Option | null
  joinedOn: string | null
  engagementEndsOn: string | null
  accessExpiresOn: string | null
}

interface MemberFormProps {
  defaults?: MemberFormDefaults
  assignableRoles: SystemRole[]
}

const engagementOptions: Option[] = (Object.keys(ENGAGEMENT_TYPE_LABELS) as EngagementType[]).map((value) => ({
  value,
  label: ENGAGEMENT_TYPE_LABELS[value],
}))

export function MemberForm({ defaults, assignableRoles }: MemberFormProps) {
  const router = useRouter()
  const isEdit = Boolean(defaults)
  const [state, submit] = useActionState(isEdit ? updateMember : inviteMember, null)
  const roleOptions: Option[] = assignableRoles.map((value) => ({ value, label: SYSTEM_ROLE_LABELS[value] }))
  const [role, setRole] = useState<Option | null>(roleOptions.find((option) => option.value === (defaults?.role ?? "employee")) ?? null)
  const errors = state && !state.ok ? state.fieldErrors : undefined
  const invalid = (field: string) => Boolean(errors?.[field]) || undefined

  useEffect(() => {
    if (!state?.ok) return
    toast.success(isEdit ? "Member updated" : "Invitation sent")
    if (!isEdit) router.push(`/people/${state.data.id}`)
  }, [state, isEdit, router])

  return (
    <form action={submit} className="flex flex-col gap-6">
      {defaults ? <input type="hidden" name="userId" value={defaults.userId} /> : null}
      <FormAlert state={state} />
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            {isEdit ? "The email address cannot be changed." : "We will email a link so they can set their own password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="name" label="Full name" required errors={errors?.name}>
            <Input id="name" name="name" defaultValue={defaults?.name} required autoComplete="off" aria-invalid={invalid("name")} />
          </FormField>
          <FormField id="email" label="Email" required errors={errors?.email}>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaults?.email}
              readOnly={isEdit}
              required
              autoComplete="off"
              aria-invalid={invalid("email")}
            />
          </FormField>
          <FormField id="role" label="System role" required errors={errors?.role}>
            <OptionCombobox id="role" name="role" required options={roleOptions} value={role} onChange={setRole} invalid={invalid("role")} />
          </FormField>
          {role?.value === "freelancer" ? (
            <FormField
              id="accessExpiresOn"
              label="Access expires on"
              errors={errors?.accessExpiresOn}
              description="Sign-in and GitHub access stop automatically after this date."
            >
              <DatePicker id="accessExpiresOn" name="accessExpiresOn" defaultValue={defaults?.accessExpiresOn} />
            </FormField>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="engagementType" label="Engagement type" required errors={errors?.engagementType}>
            <OptionCombobox
              id="engagementType"
              name="engagementType"
              required
              options={engagementOptions}
              defaultValue={engagementOptions.find((option) => option.value === (defaults?.engagementType ?? "permanent")) ?? null}
              invalid={invalid("engagementType")}
            />
          </FormField>
          <FormField id="employeeCode" label="Employee code" errors={errors?.employeeCode}>
            <Input id="employeeCode" name="employeeCode" defaultValue={defaults?.employeeCode ?? ""} aria-invalid={invalid("employeeCode")} />
          </FormField>
          <FormField id="departmentId" label="Department" errors={errors?.departmentId}>
            <OptionCombobox id="departmentId" name="departmentId" resource="departments" defaultValue={defaults?.department} placeholder="Search departments…" />
          </FormField>
          <FormField id="designationId" label="Designation" errors={errors?.designationId}>
            <OptionCombobox id="designationId" name="designationId" resource="designations" defaultValue={defaults?.designation} placeholder="Search designations…" />
          </FormField>
          <FormField id="managerId" label="Reporting manager" errors={errors?.managerId}>
            <OptionCombobox id="managerId" name="managerId" resource="people" defaultValue={defaults?.manager} placeholder="Search people…" />
          </FormField>
          <FormField id="phone" label="Phone" errors={errors?.phone}>
            <Input id="phone" name="phone" type="tel" defaultValue={defaults?.phone ?? ""} autoComplete="off" />
          </FormField>
          <FormField id="joinedOn" label="Joining date" errors={errors?.joinedOn}>
            <DatePicker id="joinedOn" name="joinedOn" defaultValue={defaults?.joinedOn} invalid={invalid("joinedOn")} />
          </FormField>
          <FormField id="engagementEndsOn" label="Contract end date" errors={errors?.engagementEndsOn}>
            <DatePicker id="engagementEndsOn" name="engagementEndsOn" defaultValue={defaults?.engagementEndsOn} invalid={invalid("engagementEndsOn")} />
          </FormField>
        </CardContent>
        <CardFooter className="justify-end">
          <SubmitButton pendingLabel={isEdit ? "Saving…" : "Sending invitation…"}>{isEdit ? "Save changes" : "Send invitation"}</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  )
}
