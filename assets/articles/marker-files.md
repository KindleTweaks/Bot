Userspace Marker Files are specialised files you can create on your Kindle when you plug it in (`/mnt/us`).
These marker files have no extension.

**Common Examples:**

- `DISABLE_CORE_DUMP`: Prevents the Kindle from generating crash logs (the `Collecting Debug Info...` screen, and random `.txt` files on-device.)
- `DO_FACTORY_RESTORE`: Performs a factory reset.
- `DONT_DELETE_CONTENT_ON_DEREGISTRATION`: Prevents default Amazon functionality which deletes all files in the Kindle's `documents` folder upon deregistration.

...Amongst others. There are many more files but some are potentially dangerous and don't have useful functionality.

**Troubleshooting & Notes:**

- Ensure the created file has no extension (e.g., `.txt`). You will need to have file extensions enabled on Windows.
- Ensure you keep the exact spelling, formatting, and capitalisation as specified.
- Please note that misuse of these marker files has the potential to cause bricks!
- You do **not** need a jailbreak to inflict these.