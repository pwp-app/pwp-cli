# pwp-cli

pwp-cli is a useful cli tool for frontend developers, it optimized the development process of web applications under pwp.app by providing some automated scripts.

## Now it can do

- Deploy your files over SFTP
- Generate random string

## Usage

### Install

```bash
npm install pwp-cli -g
```

### Deployment

```bash
pwp deploy run
```

When you run this line first time and without any configuration file in your project, the tool will guide you to create a configuration file named "pwp-deploy.json".

Because this file contains sensitive information, such as the server's password, the tool will automatically add it to .gitignore (if it exists).

When you created your configuration, you can deploy your files immediately.

You don't need to ensure that the current path is the root of the project, you just need to configure the relevant paths.

However, it is recommended to **put the configuration file in the project root directory**, as the tool will only look for it in the **current directory**.

Also, you can run the following line to create a configuration file:

```bash
pwp deploy init
```

If you want to run some shell commands before deployment, you can set "shell_before_deploy" manually in your configuration.

Example:

```json
{
  "host": "localhost",
  "port": 22,
  "username": "root",
  "password": "",
  "local_path": "./public",
  "remote_path": "/data/www",
  "always_overwrite": true,
  "shell_before_deploy": [
    "npm run build",
  ]
}
```

Also, you can set "shell_after_deploy" in the same way.

If you want to deploy your files to some different environments, you can set your config file like this:

```json
{
  "test": {
    "host": "",
    ...
  },
  "release": {
    "host": "",
    ...
  }
}
```

### Generate

#### String

You can use the following line to generate a random string during your development.

```
pwp generate string
```
