# REVORY CSV Templates

This document defines the official CSV templates for the REVORY MVP import flow.

The goal of this stage is to lock the contract for the two supported CSV templates:

- appointments
- clients

The REVORY MVP stays intentionally strict here:

- no free-form template builder
- no universal parser contract
- no broad compatibility matrix
- no aliases unless explicitly added later

## General Rules

- Encoding: UTF-8
- Delimiter: comma `,`
- Header row: required
- Empty optional fields: allowed
- Date and datetime fields: ISO 8601
- Unknown columns: out of scope for the official template contract

## Official Template: Appointments

File:

- `public/templates/revory-appointments-template.csv`

Purpose:

- import appointment records with a stable appointment identifier
- support client linkage even when the source does not provide a stable client external ID

### Required Columns

- `appointment_external_id`
- `client_full_name`
- `scheduled_at`
- `status`

### Client Link Requirement

At least one of the following columns must contain a usable value for each row:

- `client_external_id`
- `client_email`
- `client_phone`

These columns are not all mandatory at the template level, but future validation must reject rows without any client identifier.

### Optional Columns

- `client_external_id`
- `client_email`
- `client_phone`
- `service_name`
- `provider_name`
- `estimated_revenue`
- `booked_at`
- `canceled_at`
- `location_name`
- `source_notes`

### Accepted Status Values

- `SCHEDULED`
- `COMPLETED`
- `CANCELED`
- `NO_SHOW`

### Header Order

```text
appointment_external_id,client_full_name,client_external_id,client_email,client_phone,scheduled_at,status,service_name,provider_name,estimated_revenue,booked_at,canceled_at,location_name,source_notes
```

## Official Template: Clients

File:

- `public/templates/revory-clients-template.csv`

Purpose:

- import client records with a practical contract for legacy MedSpa bases
- allow identification through external ID, email, or phone

### Required Columns

- `full_name`

### Client Identification Requirement

At least one of the following columns must contain a usable value for each row:

- `external_id`
- `email`
- `phone`

These fields stay optional in the template contract, but future validation must reject rows without any client identifier.

### Optional Columns

- `external_id`
- `email`
- `phone`
- `last_visit_at`
- `total_visits`
- `tags`
- `notes`

### Header Order

```text
full_name,external_id,email,phone,last_visit_at,total_visits,tags,notes
```

## Aliases

No aliases are part of the official contract in this stage.

This keeps the MVP strict, predictable, and easy to validate in the next import steps while staying realistic for MedSpa data quality.
