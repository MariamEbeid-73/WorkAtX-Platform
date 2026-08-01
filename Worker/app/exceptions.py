class MalformedAIResponseError(Exception):
    """
    Raised when the AI service returns something that doesn't match the
    expected contract (wrong type, missing required fields, etc).
    """
    pass