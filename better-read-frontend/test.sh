API_GATEWAY='https://8cekws5yt5.execute-api.ap-southeast-1.amazonaws.com/prod'

response=$(curl -X POST "$API_GATEWAY/recommendations" \
     -H "Content-Type: application/json" \
     -d '{"books":[{"isbn":"0553272543","rating":0},{"isbn":"0684717603","rating":0}],"limit_per_book":5}'
)

echo $response

