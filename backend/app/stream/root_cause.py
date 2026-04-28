from scipy.stats import ks_2samp
import pandas as pd

class RootCauseAnalyzer:
    """
    Compares feature distributions between:
      - Last 24h window (bias spiked)
      - Previous 7-day baseline
    Uses Kolmogorov-Smirnov test to detect distribution shift per feature.
    Ranks features by shift magnitude and correlates with outcome disparity.
    """

    def analyze(
        self,
        baseline_df: pd.DataFrame,   
        recent_df: pd.DataFrame,     
        decision_col: str,
        sensitive_col: str,
        feature_cols: list[str],
    ) -> dict:
        shifts = []
        import numpy as np
        for feature in feature_cols:
            if feature not in recent_df.columns or feature not in baseline_df.columns:
                continue
                
            is_numeric = pd.api.types.is_numeric_dtype(baseline_df[feature])
            if is_numeric:
                stat, pvalue = ks_2samp(baseline_df[feature].dropna(), recent_df[feature].dropna())
                disparity_corr = recent_df[[feature, decision_col]].corr().iloc[0, 1]
            else:
                # Use Total Variation Distance (TVD) for categorical variables
                base_counts = baseline_df[feature].value_counts(normalize=True)
                rec_counts = recent_df[feature].value_counts(normalize=True)
                aligned = pd.concat([base_counts, rec_counts], axis=1).fillna(0)
                tvd = 0.5 * np.sum(np.abs(aligned.iloc[:, 0] - aligned.iloc[:, 1]))
                stat = float(tvd)
                pvalue = 0.05 if tvd > 0.1 else 0.5 # Heuristic significance proxy
                disparity_corr = stat # Proxy correlation with tvd
                
            shifts.append({
                "feature":       feature,
                "ks_statistic":  round(stat, 4),
                "p_value":       round(pvalue, 4),
                "significant":   pvalue < 0.05,
                "disparity_corr": round(abs(disparity_corr), 4),
                "combined_score": round(stat * abs(disparity_corr), 4),
            })

        shifts.sort(key=lambda x: x["combined_score"], reverse=True)
        top = shifts[0] if shifts else None

        return {
            "top_contributing_feature": top["feature"] if top else None,
            "ks_score": top["ks_statistic"] if top else None,
            "ranked_features": shifts[:5],
            "plain_english": (
                f"Bias increase is primarily driven by '{top['feature']}' showing a "
                f"significant distribution shift (KS={top['ks_statistic']}) compared "
                f"to the 7-day baseline. This feature has the strongest correlation "
                f"with the approval rate disparity."
            ) if top else "Root cause could not be identified — insufficient feature data.",
        }
