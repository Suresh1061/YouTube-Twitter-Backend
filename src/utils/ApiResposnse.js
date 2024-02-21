class ApiResponse {
    constructor(statusCode, data, message = "success") {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }
}

export { ApiResponse }

// const data = new ApiResponse(200, "suresh", "success");
//  console.log(data);