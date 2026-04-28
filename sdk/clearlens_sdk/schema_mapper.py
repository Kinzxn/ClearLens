class SchemaMapper:
    """
    Maps an organization's custom schema to the ClearLens standard format.
    """
    def __init__(self, config: dict):
        self.config = config

    def map_payload(self, raw_data: dict) -> dict:
        mapped = raw_data.copy()
        
        decision_field = self.config.get("decision_field")
        positive_val = self.config.get("decision_positive_value")
        
        # Standardize the decision to a boolean 'decision' field
        if decision_field and decision_field in mapped:
            mapped["decision"] = (mapped[decision_field] == positive_val)
            
        # Ensure timestamp exists
        timestamp_field = self.config.get("timestamp_field")
        if timestamp_field and timestamp_field in mapped:
            mapped["timestamp"] = mapped[timestamp_field]
            
        return mapped
