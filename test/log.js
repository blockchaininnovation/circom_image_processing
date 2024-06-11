import fs from 'fs';
import path from 'path';
import { EOL } from 'os';

const logDir = './result/'; // ログファイルがあるディレクトリ
const csvFile = './result/output.csv'; // 出力するCSVファイル

function appendToCSV(data) {
    fs.appendFileSync(csvFile, `${data}${EOL}`);
}

export { extractLogs };
function extractLogs() {
    try {
        if (fs.existsSync(csvFile)) {
            fs.unlinkSync(csvFile);
        }
        // header
        appendToCSV(`no,image_file,image_size,template_instances,non_linear_constraints,linear_constraints,public_inputs,public_outputs,private_inputs,wires,labels,build_time (ms),proof_gen_time (ms),Maximum resident set size (kbytes),Percent of CPU this job got`);
        const files = fs.readdirSync(logDir);

        var line_num = 1;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if ((path.extname(file) === '.log') && !file.includes(".err.")) {
                var image_file = file.replace(".log", "");
                var image_size = "";
                var template_instances = "";
                var non_linear_constraints = "";
                var linear_constraints = "";
                var public_inputs = "";
                var public_outputs = "";
                var private_inputs = "";
                var wires = "";
                var labels = "";
                var build_time = "";
                var proof_gen_time = "";

                var max_memory_consumption = "";
                var cpu_usage = "";

                const filePath = path.join(logDir, file);
                const content = fs.readFileSync(filePath, 'utf8');

                const lines = content.split(EOL);
                for (let j = 0; j < lines.length; j++) {
                    const line = lines[j];

                    if (line.includes("[32mtemplate instances[0m:")) {
                        template_instances = line.replace("[32mtemplate instances[0m: ", "");
                    } else if (line.includes("non-linear constraints: ")) {
                        non_linear_constraints = line.replace("non-linear constraints: ", "");
                    } else if (line.includes("linear constraints: ") && !line.includes("non-linear constraints: ")) {
                        linear_constraints = line.replace("linear constraints: ", "");
                    } else if (line.includes("public inputs: ")) {
                        public_inputs = line.replace("public inputs: ", "");
                    } else if (line.includes("public outputs: ")) {
                        public_outputs = line.replace("public outputs: ", "");
                    } else if (line.includes("private inputs: ")) {
                        private_inputs = line.replace("private inputs: ", "");
                    } else if (line.includes("wires: ")) {
                        wires = line.replace("wires: ", "");
                    } else if (line.includes("labels: ")) {
                        labels = line.replace("labels: ", "");
                    } else if (line.includes("$encrypted_data: ")) {
                        image_size = line.replace("$encrypted_data: ", "").replace("true", "").replace(" ", "");
                    } else if (line.includes("proof gen time:")) {
                        proof_gen_time = line.replace("proof gen time: ", "").replace("[ms]", "").replace(" ", "");
                    } else if (line.includes("execution_time_ms: ")) {
                        build_time = line.replace("execution_time_ms: ", "").replace(" ", "");
                    } else if (line.includes("Maximum resident set size (kbytes):")) {
                        max_memory_consumption = line.replace("	Maximum resident set size (kbytes): ", "");
                    } else if (line.includes("Percent of CPU this job got:")) {
                        cpu_usage = line.replace("	Percent of CPU this job got: ", "");
                    }
                }
                appendToCSV(`${line_num},${image_file},${image_size},${template_instances},${non_linear_constraints},${linear_constraints},${public_inputs},${public_outputs},${private_inputs},${wires},${labels},${build_time},${proof_gen_time},${max_memory_consumption},${cpu_usage}`);
                line_num++;
            }
        }

        console.log('CSVファイルの作成が完了しました。');
    } catch (err) {
        console.error('エラーが発生しました:', err);
    }
}