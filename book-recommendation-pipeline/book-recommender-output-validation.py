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
    MIN_EXPECTED_SIMILARITIES = 20000
    
    # Get glue job name from event or use default
    glue_job_name = event.get('glue_job_name', 'book-recommender-job')
    
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
            print(f"Could not check Glue job status: {e}")
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
                    if not results["message"]:  # Only set if no previous message
                        results["message"] = f"Table {table_name} has insufficient data: {item_count} items"
                    
                # Sample a few records to verify data quality (use resource for scan)
                try:
                    table = dynamodb_resource.Table(table_name)
                    sample_response = table.scan(Limit=5)
                    sample_items = sample_response.get('Items', [])
                    results["checks"][f"{table_name}_sample_valid"] = len(sample_items) > 0
                    
                    if len(sample_items) == 0 and item_count > 0:
                        results["verified"] = False
                        if not results["message"]:
                            results["message"] = f"Table {table_name} has items but scan returned none"
                            
                except Exception as e:
                    print(f"Could not sample table {table_name}: {e}")
                    results["checks"][f"{table_name}_sample_valid"] = False
                    if item_count > 0:  # Only mark as failed if we expected data
                        results["verified"] = False
                        if not results["message"]:
                            results["message"] = f"Table {table_name} scan failed: {str(e)}"
                    
            except Exception as e:
                print(f"Error checking table {table_name}: {e}")
                results["checks"][f"{table_name}_exists"] = False
                results["verified"] = False
                results["message"] = f"Table {table_name} not accessible: {str(e)}"
        
        # Final message
        if results["verified"]:
            total_items = sum(results["table_counts"].values())
            results["message"] = f"Output verification passed. Total items: {total_items}"
        
        print(f"Verification result: {json.dumps(results, indent=2)}")
        
        # Return the object directly for Step Functions
        return {
            "statusCode": 200,
            "body": results
        }
        
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