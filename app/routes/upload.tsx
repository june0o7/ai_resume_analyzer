// import { prepareInstructions } from "constants";
import { prepareInstructions } from "constants/index";
import React, { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import FileUploader from "~/components/FileUploader";
import Navbar from "~/components/Navbar";
import { convertPdfToImage } from "~/lib/pdf2img";
import { usePuterStore } from "~/lib/puter";
import { generateUUID } from "~/lib/utils";

const upload = () => {
  const { auth, isLoading, fs, ai, kv } = usePuterStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const handleFileSelect = (file: File | null) => {
    setFile(file);

  }
  const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File }) => {
    setIsProcessing(true);
    setStatusText("Analyzing your resume...");
    const uploadFile = await fs.upload([file]);
    if (!uploadFile) return setStatusText("Failed to upload the file. Please try again.");
    
    setStatusText("converting to image...");
    const imageFile = await convertPdfToImage(file);
    if ( !imageFile.file) return setStatusText("Failed to convert PDF to image. Please try again.");
    setStatusText("uploading the image...");
    const uploadedImage = await fs.upload([imageFile.file]);
    if (!uploadedImage) return setStatusText("Failed to upload the image. Please try again.");
    setStatusText("Analyzing the resume.../ preparing data...");
   
    const uuid = generateUUID();

    const data = { 
      id: uuid,
      resumePath: uploadFile.path,
      imagePath: uploadedImage.path,
      companyName,
      jobTitle,
      jobDescription,
      feedback : "",
    }
    await kv.set(`resume:${uuid}`, JSON.stringify(data));
    setStatusText("Analyzing 50%...");

    const feedback = await ai.feedback(
      uploadFile.path,
      prepareInstructions({jobTitle, jobDescription})
    )
    if (!feedback) {
      setStatusText("Failed to analyze the resume. Please try again.");
      
      return;
    }
    const feedbackText  =typeof feedback.message.content === "string" ? feedback.message.content: feedback.message.content[0].text;

    data.feedback = JSON.parse(feedbackText);
    await kv.set(`resume:${uuid}`, JSON.stringify(data));
    setStatusText("analysis complete/Saving data...");
    console.log("data", data);

  }
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget.closest("form");
    if (!form) return;
    const formData = new FormData(form);

    const companyName = formData.get("company-name") as string;
    const jobTitle = formData.get("job-title") as string;
    const jobDescription = formData.get("job-description") as string;

    // console.log("Company Name:", companyName);
    // console.log("Job Title:", jobTitle);
    // console.log("Job Description:", jobDescription);
    // console.log("File:", file);

    if (!file) {
      alert("Please upload a resume file.");
      return;
    }
    handleAnalyze({ companyName, jobTitle, jobDescription, file })

  }

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Upload your Resume</h1>
          <h2>Get AI-powered feedback on your resume</h2>
          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img
                src="/images/resume-scan.gif"
                alt="Processing"
                className="w-full"
              />
            </>
          ) : (
            <h2>drop your resume for an ATS score and improvement tips</h2>
          )}
          {!isProcessing &&
            <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input type="text" name="company-name" placeholder="Company Name" id="company-name" />

              </div>
              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input type="text" name="job-title" placeholder="Job Title" id="job-title" />

              </div>
              <div className="form-div">
                <label htmlFor="job-description">Job Description</label>
                <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description" />

              </div>
              <div className="form-div">
                <label htmlFor="uploader">Upload Resume</label>
                <FileUploader onFileSelect={handleFileSelect} />
                {/* <input type="text" name="job-title" placeholder="Job Title" id="job-title"/> */}

              </div>
              <button type="submit" className="primary-button">Analyze Resume</button>


            </form>}
        </div>
      </section>
    </main>
  );
};

export default upload;
