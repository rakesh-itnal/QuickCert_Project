import { runPythonIntelligentFiller } from "./src/lib/python-bridge";

async function test() {
    try {
        console.log("Testing bridge...");
        const buf = await runPythonIntelligentFiller(
            "C:\\Users\\rakes\\OneDrive\\Desktop\\QuickCert_Project\\test_certificates\\BHAGYASHREE_SHRISHAIL_UTTUR_STUDY_A.pdf",
            { name: "BRIDGE TEST", nationality: "PRO TOOL" }
        );
        console.log("SUCCESS! Got buffer of size:", buf.length);
    } catch(e) {
        console.error("Bridge Error:", e);
    }
}
test();
