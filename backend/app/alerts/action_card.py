from ollama import AsyncClient as OllamaClient
import json

DOMAIN_CONTEXT = {
    "lending":    "loan approval decisions affecting people's financial access",
    "hiring":     "job application screening affecting people's career opportunities",
    "healthcare": "medical triage or resource allocation affecting patient outcomes",
    "general":    "automated decisions affecting real people",
}

async def generate_action_card(
    alert: dict,
    domain: str = "general",
    drift_result: dict | None = None,
    contradictions: list | None = None,
    confidence_interval: tuple | None = None,
) -> dict:
    ci_note = ""
    if confidence_interval:
        ci_note = f"95% confidence interval: ({confidence_interval[0]}, {confidence_interval[1]})"

    drift_note = ""
    if drift_result and drift_result.get("drift_detected"):
        drift_note = (
            f"Drift trajectory: {drift_result.get('plain_english', '')} "
            f"Simulated value in 7 days: {drift_result.get('simulated_7day_impact', 'unknown')}"
        )

    contradiction_note = ""
    if contradictions:
        contradiction_note = (
            "⚠️ CONTRADICTION DETECTED: " + contradictions[0].get("explanation", "")
            + " Recommendation: " + contradictions[0].get("recommendation", "")
        )

    prompt = f"""
    You are a bias monitoring assistant. An alert has fired in a real-time AI system.

    Context:
    - Domain: {DOMAIN_CONTEXT.get(domain, DOMAIN_CONTEXT['general'])}
    - Metric: {str(alert.get('metric_name', ''))[:100]}
    - Value: {alert.get('metric_value', '')} (threshold: 0.10)
    - Severity: {alert.get('severity', '')}
    - Statistical confidence: {ci_note or 'not provided'}
    - Drift projection: {drift_note or 'not available'}
    - Fairness conflicts: {contradiction_note or 'none detected'}

    Write a concise action card with:
    1. A 1-sentence summary in plain English (no jargon)
    2. Exactly 3 numbered steps the organization should take RIGHT NOW
    3. ONE tradeoff warning: "If you do X to fix this, Y will likely worsen"
    4. A confidence note if sample size is small

    Format: JSON with keys:
      "summary" (string),
      "steps" (list of 3 strings),
      "tradeoff_warning" (string),
      "confidence_note" (string or null)
    """

    try:
        client = OllamaClient()
        response = await client.chat(
            model="gemma3:1b",
            messages=[{"role": "user", "content": prompt}],
        )
        # Parse out JSON from response text (might include markdown ticks)
        text = response.message.content.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception:
        # Fallback card
        return {
            "summary": "Bias detected. Immediate review recommended.",
            "steps": [
                "Pause new decisions from this system temporarily.",
                "Review the last 200 decisions manually for the affected group.",
                "Contact your data science team to retrain or adjust the model.",
            ],
            "tradeoff_warning": (
                "Reducing approval rates for over-represented groups to achieve parity "
                "may trigger disparate impact claims — involve legal review."
            ),
            "confidence_note": None,
        }
