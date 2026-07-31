from tasks.process_job import process_job

job = {
    "jobId": "123e4567",
    "userId": "user_123",
    "question": "Find my match for backend developer",
    #Ai wiil take it from end point delete from here
    "resumeData": {
        "skills": ["C#", "SQL"],
        "experience": []
    }
}

result = process_job.delay(job)

print("Task sent")
print(result.id)
#send message to redis it will change to real backend
