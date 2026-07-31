#AI communication

class AIClient:
    def __init__(self):
        print("AI client initialized")

    def build_request(self, job):
        """
        Convert the Redis job into the AI request payload.

        TODO:
        Waiting for the AI team to finalize the request schema.
        """
        raise NotImplementedError(
            "AI request schema has not been finalized."
        )

    def submit_analysis(self, payload):
        """
        Send POST /analyze.

        TODO:
        Implement when the AI endpoint becomes available.
        """
        raise NotImplementedError(
            "submit_analysis() is not implemented yet."
        )


    def poll_status(self, ai_job_id):
        """
        Poll GET /status/{id} until the AI finishes.

        TODO:
        Implement when the polling contract is finalized.
        """
        raise NotImplementedError(
            "poll_status() is not implemented yet."
        )
    def handle_response(self, response):
        """
        Process the AI response.

        This method can stay simple for now and will be extended
        when the final response contract is available.
        """
        print("AI Response:")
        print(response)

        return response