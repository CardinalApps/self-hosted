const i18n = {
  "indexing.patch.state.description": {
    "en": `
Returns a snapshot of the indexing state at 
this current moment. Use this endpoint for one-time checks. 
For real-time updates, use the \`/events/subscribe\` endpoint 
instead.
<!-- Leave this line empty -->
`,
  },

  "indexing.get.state.200": {
    "en": `
The returned object will contain the state of the indexing service. 
Possible states are: {states}
<!-- Leave this line empty -->
`,
  },

  "indexing.get.state.description": {
    "en": `
Update the state of the currently running indexing operation. This endpoint
is dedicated to controlling the indexing service from the frontend, and
cannot update completed runs.

This endpoint is designed to accept actions. Instead of sending the desired
state, send an action and let the indexing service handle the change
internally. So, you send "stop", and internally the service will terminate
the run and change the state to \`idle\`.

Accepted actions are:

- \`pause\` - Pauses the run after the current file has completed indexing.
The internal state will change to \`paused\`.
- \`resume\` - Resumes a run and continues with the next file. Triggering
resume on a run that isn't paused will have no effect. The internal
state will change to \`indexing\`.
- \`stop\` - Stops a run after the current file has completed indexing. The
internal state will change to \`idle\`, and a new run can be started.
<!-- Leave this line empty -->
`,
  },

  "indexing.patch.state.409": {
    "en": `
Returns a 409 if the action is not compatible 
with the current indexing state. For example, sending \`stop\` 
while the server is \`idle\`.
<!-- Leave this line empty -->
`,
  },

  "indexing.post.runs.description": {
    "en": `
Creates a new Run in the database and starts the indexing operation for
that Run. This endpoint can only be used if there is not currently a run
running.

The indexing operation will continue to run on the server after this
endpoint has returned a response.
<!-- Leave this line empty -->
`,
  },

  "indexing.get.files.description": {
    "en": `
Get one or more files from your index. Depending on the filetype, addtional
information will be returned about the entities that were extracted from
the file.
<!-- Leave this line empty -->
`,
  },

  "indexing.delete.description": {
    "en": `
Deindexes one or more files. To "deindex" means to delete the file entity
and all of its derived entities like songs and episodes, and all of their
derived entities like metadata and thumbnails.

Deindexing however does not delete cached static resources on the disk like
the thumbnail files that the server generates when initially indexing
things. Those now stale assets will eventually be deleted by a cleanup cron
job.

If a wildcard (\`*\`) is given as the sole item in the array, all files will
be deindexed. The wildcard method only supports hard deleting, so you must
also set \`hardDelete\` to true to activate it. Only a \`true\` boolean will be
returned when the wildcard operation is done.

By default, this deindexing is a soft delete. To perform a hard delete, set
the \`hardDelete\` param to true.
<!-- Leave this line empty -->
`,
  },
}

export default i18n
