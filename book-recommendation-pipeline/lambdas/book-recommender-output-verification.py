import json
import boto3
from datetime import datetime, timedelta

def lambda_handler(event, context):
    """
    Verify that Glue job completed successfully and DynamoDB tables are populated
    """
    dynamodb_client = boto3.client('dynamodb')  
    dynamodb_resource = boto3.resource('dynamodb')  
    glue = boto3.client('glue')
    
    # Configuration
    DYNAMODB_TABLES = ["Books", "BookSimilarities"]
    MIN_EXPECTED_BOOKS = 1000
    MIN_EXPECTED_SIMILARITIES = 10000
    
    # Get glue job name from event or use default
    glue_job_name = event.get('glue_job_name', 'book-recommender')
    
    results = {
        "verified": True,
        "checks": {},
        "message": "",
        "glue_job_status": "UNKNOWN",
        "table_counts": {}
    }
    
    try:
        # Check 1: Verify Glue job status
        try:
            response = glue.get_job_runs(JobName=glue_job_name, MaxResults=1)
            if response['JobRuns']:
                latest_run = response['JobRuns'][0]
                job_status = latest_run['JobRunState']
                results["glue_job_status"] = job_status
                results["checks"]["glue_job_completed"] = (job_status == "SUCCEEDED")
                
                if job_status != "SUCCEEDED":
                    results["verified"] = False
                    results["message"] = f"Glue job failed with status: {job_status}"
            else:
                results["checks"]["glue_job_completed"] = False
                results["verified"] = False
                results["message"] = "No Glue job runs found"

        except Exception as e:
            results["checks"]["glue_job_completed"] = False
            results["verified"] = False
            results["message"] = f"Error checking Glue job: {str(e)}"
        
        # Check 2: Verify DynamoDB tables exist and have data
        for table_name in DYNAMODB_TABLES:
            try:
                # Use client for describe_table
                describe_response = dynamodb_client.describe_table(TableName=table_name)
                item_count = describe_response['Table'].get('ItemCount', 0)
                results["table_counts"][table_name] = item_count
                results["checks"][f"{table_name}_exists"] = True
                
                # Check if table has reasonable amount of data
                if table_name == "Books":
                    has_sufficient_data = item_count >= MIN_EXPECTED_BOOKS
                else:  # BookSimilarities
                    has_sufficient_data = item_count >= MIN_EXPECTED_SIMILARITIES
                
                results["checks"][f"{table_name}_has_data"] = has_sufficient_data
                
                if not has_sufficient_data:
                    results["verified"] = False
                    if not results["message"]: 
                        results["message"] = f"Table {table_name} has insufficient data: {item_count} items"
                    
            except Exception as e:
                results["checks"][f"{table_name}_exists"] = False
                results["verified"] = False
                results["message"] = f"Table {table_name} not accessible: {str(e)}"
        
        if results["verified"]:
            total_items = sum(results["table_counts"].values())
            results["message"] = f"Output verification passed. Total items: {total_items}"
        
        return results
        
    except Exception as e:
        error_msg = f"Verification error: {str(e)}"
        print(error_msg)
        return {
            "verified": False,
            "message": error_msg,
            "checks": {},
            "table_counts": {},
            "glue_job_status": "UNKNOWN"
        }