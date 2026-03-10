import { createAsyncThunk } from '@reduxjs/toolkit'

/**
 * Fetches the indexed file count for each media type.
 */
const onSSEJobCompleted = createAsyncThunk(`sse/job.completed`, async (data) => {
  console.log(data)
})

export default onSSEJobCompleted
