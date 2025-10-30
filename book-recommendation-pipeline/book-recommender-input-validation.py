import json
import boto3
from botocore.exceptions import ClientError

def lambda_handler(event, context):
    s3 = boto3.client('s3')

    BUCKET_NAME = "book-recommender-raw-data"
    REQUIRED_FILES = ["Books.csv", "Ratings.csv"]
    
    results = {
        "valid": True,
        "missing_files": [],
        "existing_files": [],
        "file_sizes": {},
        "message": ""
    }
    
    try:
        # Check each required file
        for file_name in REQUIRED_FILES:
            try:
                response = s3.head_object(Bucket = BUCKET_NAME, Key = file_name)
                results["existing_files"].append(file_name)
                results["file_sizes"][file_name] = response['ContentLength']
                
                if response['ContentLength'] < 100:
                    results["valid"] = False
                    results["message"] = f"File {file_name} is too small"
                    
            except ClientError as e:
                if e.response['Error']['Code'] == '404':
                    results["missing_files"].append(file_name)
                    results["valid"] = False
                else:
                    raise e
        
        if results["missing_files"]:
            results["message"] = f"Missing files: {', '.join(results['missing_files'])}"
        elif results["valid"]:
            results["message"] = "All required files present and valid"
            
        print(f"Validation result: {json.dumps(results, indent=2)}")
        
        return {
            "statusCode": 200,
            "body": results
        }
        
    except Exception as e:
        error_msg = f"Validation error: {str(e)}"
        print(error_msg)
        return {
            "statusCode": 500,
            "body": {
                "valid": False,
                "message": error_msg,
                "missing_files": REQUIRED_FILES,
                "existing_files": [],
                "file_sizes": {}
            }
        }