let's keep having this discussion! as this is a desktop app, and at least for now, it would run in offline, airgap mode (in future it would evole) so we can keep this aspect in mind. Now well before OTel, I remember we used to have two things:

Step 1:
- Error clssification: Critical, High, Medium, Low
- Flexible and extensible Error numbering scheme
  - Have a series of error codes
      - 1000000: crtical issues
          1000100: Vault Module (101 - 199: we can use error codes for all kind of issues within this module)
          1000200: Infrastrcuture - Age
          1000300: Infrastrcuture - Ykman
          1000400: Infrastrcuture - PTY
          1000500: Passpharase
          ...
          1001000: ABC
          1001100: XYZ
          ...
      - 2000000: high
      - 3000000: medium
      - 4000000: low
      - 5000000: info
  - This seried should be flexible and extensible (e.g. level a range of 1-99 between all the major ranges)
  - Once we have all the modules and number ranges assigned then create a CENTRALIZED file with a simple key=value pair (it can be json now but should be simple)

Step 2:
      # CRITICAL
      1000001: Vault could not be created due to file system access issues
      ...
      ...
      ...

      # HIGH
      2000021: Vault name has invalid characters.

Step 3:
Engineers can only use the assigned ranges within their apps:

log.info('5000013', msg) // this message will be read from the centralized error file

log.critical('1000001', msg) // this message will be read from the centralized error file


Benfits:
- forces engineer to be more midnful and thoughtful in desgning their app with proper error codes and messages not just logging junk messages ('hello work, i am here 1, i am here 2 :)')
- easy to trace and pinpoint the origin of the message
- this is specially helpful in big enterprise apps as they grow more complex, error/logging can be very bad if not designed properly or it can be a very healthy and provide a solid feedback loop to enhance the app in future

Logging:
- In our case, we are not going to have graphana, splunk etc. But we have a centralized logging which the packaged app would create on user machines. For e.g. on MAC (win, linux would depend on the OS file system) it is in ~/Library/Application\ Support/com.Barqly.Vault/logs/barqly-vault.log
- Currently logs are using some utc timestamps, but we want to use user local OS timezone/local
- Currently we don't have any log rotation. Like to get your though should we rotate the logs on every app start?
