"""Adapt pinned public Kaggle synthetic datasets for a local REVORY proof."""

import csv
import hashlib
import json
import sys
import zipfile
from decimal import Decimal
from pathlib import Path

SAAS_SHA256 = "57e674f75ec8ac9ced3e46e66731adcfe7ef134b4f4596985e629b783bc93b6f"
AGENTS_SHA256 = "1fa861897d5ec6440b5a11231487e063f03869c11e341953cec0ee16b4246d52"
START, END = "2026-05-01T00:00:00Z", "2026-06-01T00:00:00Z"


def checked_zip(path: Path, expected: str) -> zipfile.ZipFile:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != expected:
        raise ValueError(f"Kaggle archive hash changed: {path.name}")
    return zipfile.ZipFile(path)


def rows(archive: zipfile.ZipFile, name: str) -> list[dict[str, str]]:
    with archive.open(name) as stream:
        return list(csv.DictReader((line.decode("utf-8-sig") for line in stream)))


def write_csv(path: Path, fieldnames: list[str], records: list[dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("Usage: python scripts/prepare-ai-kaggle-proof.py SAAS.zip AGENTS.zip OUTPUT_DIR")
    saas_path, agent_path, output_dir = map(Path, sys.argv[1:])
    output_dir.mkdir(parents=True, exist_ok=True)
    with checked_zip(saas_path, SAAS_SHA256) as saas, checked_zip(agent_path, AGENTS_SHA256) as agents:
        invoices = sorted(
            (r for r in rows(saas, "invoices.csv") if r["status"] == "paid" and r["paid_on"].startswith("2026-05")),
            key=lambda r: int(r["invoice_id"]),
        )[:12]
        incidents = sorted(
            (r for r in rows(agents, "ai_agent_observability_dataset.csv")
             if r["timestamp"].startswith("2026-05") and r["llm_model"].startswith("gpt-")),
            key=lambda r: r["incident_id"],
        )[:20]
    if len(invoices) != 12 or len(incidents) != 20 or any(int(r["token_usage"]) <= 1000 for r in incidents):
        raise ValueError("Pinned Kaggle sample no longer satisfies the proof contract")
    revenue = [{
        "externalId": f"kg-saas-invoice-{r['invoice_id']}", "eventKind": "CHARGE", "status": "paid",
        "occurredAt": f"{r['paid_on']}T12:00:00Z", "amountMinor": str(Decimal(r["amount_paid"]) * 100),
        "currency": "USD", "currencyExponent": "2", "stripeInvoiceId": "",
    } for r in invoices]
    revenue_fields = list(revenue[0])
    write_csv(output_dir / "revenue-adapted.csv", revenue_fields, revenue)

    total_tokens = sum(int(r["token_usage"]) for r in incidents)
    total_estimated_cost = sum((Decimal(r["cost_usd"]) for r in incidents), Decimal(0))
    for scenario in ("unlinked", "injected-linked"):
        linked = scenario == "injected-linked"
        ledger = [{
            "externalId": f"kg-{r['incident_id']}",
            "occurredAt": r["timestamp"].replace(" ", "T") + "Z",
            "quantity": str(int(r["token_usage"]) - (1000 if linked and i == 0 else 0)),
            "unit": "tokens", "internalCustomerExternalId": "customer_kaggle_fixture" if linked else "",
            "provider": "openai", "providerRequestId": "",
            "providerProjectId": "proj_kaggle_fixture" if linked else "", "model": r["llm_model"],
        } for i, r in enumerate(incidents)]
        provider = [{
            "externalId": f"kg-agent-may-2026-{scenario}", "provider": "openai",
            "windowStart": START, "windowEnd": END, "costBasis": "ESTIMATED",
            "costAmount": str(total_estimated_cost), "costCurrency": "USD",
            "usageQuantity": str(total_tokens), "usageUnit": "tokens",
            "organizationId": "org_kaggle_fixture" if linked else "",
            "projectId": "proj_kaggle_fixture" if linked else "", "model": "",
            "reportedAt": "2026-10-13T00:00:00Z",
        }]
        write_csv(output_dir / f"ledger-{scenario}.csv", list(ledger[0]), ledger)
        write_csv(output_dir / f"provider-{scenario}.csv", list(provider[0]), provider)

    manifest = {
        "purpose": "Local synthetic proof only; no customer analysis or financial validation",
        "sourceArchives": [
            {"url": "https://www.kaggle.com/datasets/generaterealdata/synthetic-saas-subscriptions-churn", "version": 1, "sha256": SAAS_SHA256, "license": "CC BY 4.0", "attribution": "Synthetic SaaS Subscriptions and Churn, GenerateRealData (https://generaterealdata.com)"},
            {"url": "https://www.kaggle.com/datasets/hamzaabbasai/ai-agent-observability-dataset", "version": 1, "sha256": AGENTS_SHA256, "license": "Apache 2.0"},
        ],
        "period": {"start": START, "end": END},
        "selection": {"paidInvoices": len(revenue), "gptIncidents": len(incidents)},
        "knownLimitations": [
            "Neither dataset is a Stripe or AI-provider export; CSVs are adapted to the REVORY contract.",
            "Agent cost_usd is an estimate, not reported provider spend.",
            "Agent timestamps lack timezone; this fixture explicitly assumes UTC.",
            "Revenue and AI incidents have no common customer IDs; no revenue or margin reconciliation is valid.",
            "The linked scenario adds fictional project/customer IDs and subtracts 1000 ledger tokens from one row to test a known fault.",
            "No source proves that a project is exclusive to a customer; the linked mapping is a test assumption only.",
        ],
        "expected": {"providerTokens": total_tokens, "estimatedCostUsd": str(total_estimated_cost), "injectedTokenDelta": 1000},
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared Kaggle proof: {len(revenue)} invoices, {len(incidents)} GPT incidents, {total_tokens} tokens, USD {total_estimated_cost} estimated cost")


if __name__ == "__main__":
    main()
