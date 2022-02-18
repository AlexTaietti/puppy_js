import PageLogger from "./PageLogger";

class BrutePageLogger extends PageLogger {

   constructor(prefix?: string) {
      super(prefix);
   }

   public logRunStart() { this.log(`starting brute run...`); }

   public logRunProgression(index: number, targetNumber: number) {
      const currentIndex = this.makeYellow(index + 1);
      const totalTargets = this.makeYellow(targetNumber);
      this.log(`Extracting data from url ${currentIndex} out of ${totalTargets}`);
   }

   public logRunFailure(error: Error) { this.logError(`Run failed -> ${error.stack}`); }

}

export default BrutePageLogger;